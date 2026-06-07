/**
 * algo-demo.ts
 *
 * Standalone demo of the OpenSlot AI slot-fill algorithm.
 * Runs entirely in Node — no server, no database, no Fonio calls.
 *
 * Usage:
 *   npx tsx scripts/algo-demo.ts
 *   npx tsx scripts/algo-demo.ts --seed 42
 *   npx tsx scripts/algo-demo.ts --mode Aggressive
 *
 * What it shows:
 *   1. A slot opens (cancellation detected)
 *   2. Candidates are ranked by the real scoring function
 *   3. Wave size is calculated for the current time pressure
 *   4. The fill loop runs until the slot is booked or expires
 */

import {
  calculateWaveSize,
  eligibleForNextWave,
  estimateSlotCallSuccess,
  rankCandidates,
  type RankedCandidate,
} from "../src/lib/fonio/backend/algorithm.js";
import type { Candidate, FillMode, Slot } from "../src/lib/fonio/types.js";

// ── CLI args ──────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith("--"))
    .map(a => { const [k, v] = a.slice(2).split("="); return [k, v ?? "true"]; })
);

const SEED     = Number(args.seed ?? 7);
const FILL_MODE: FillMode = (["Patient", "Balanced", "Aggressive"].includes(args.mode ?? "")
  ? args.mode
  : "Balanced") as FillMode;
const SLOT_LEAD_MIN = Number(args.lead ?? 45); // minutes until slot starts

// ── Seeded RNG (mulberry32) ──────────────────────────────────────────────

function makeRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(SEED);
const bool  = (p: number) => rng() < p;
const pick  = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const intR  = (lo: number, hi: number) => Math.floor(rng() * (hi - lo + 1)) + lo;

// ── Candidate pool ────────────────────────────────────────────────────────

const NAMES = [
  "Maria Gruber", "Johannes Huber", "Anna Bauer", "Stefan Wagner",
  "Elisabeth Mayer", "Michael Pichler", "Claudia Leitner", "Thomas Moser",
  "Sandra Wimmer", "Andreas Steiner",
];

const MATCH_REASONS = [
  "Slot matches preferred Monday morning window",
  "Service match — MRI on waitlist",
  "VIP patient — priority flag set",
  "Runner-up boost from previous accepted slot",
  "Preference for Dr. Weber matches this opening",
  "Service and provider compatible with waitlist entry",
];

function buildCandidates(): Candidate[] {
  return NAMES.map((name, i) => {
    const eligible    = bool(0.75);
    const runnerUp    = bool(0.12);
    const vip         = bool(0.08);
    const matchReason = eligible
      ? (runnerUp ? MATCH_REASONS[3] : vip ? MATCH_REASONS[2] : pick(MATCH_REASONS.slice(0, 3).concat(MATCH_REASONS.slice(4))))
      : "No consent on file";

    const skipReason = !eligible
      ? pick(["No consent on file", "Weekly contact limit reached", "Contacted less than 1h ago"])
      : undefined;

    return {
      id:            `p-${i + 1}`,
      name,
      rank:          0,
      matchReason,
      waitDays:      intR(2, 30),
      contactStatus: "not_contacted" as const,
      eligible,
      lastContacted: bool(0.2) ? new Date(Date.now() - intR(30, 480) * 60_000).toISOString() : null,
      skipReason,
      runnerUpBoost: runnerUp || vip,
    };
  });
}

function makeSlot(candidates: Candidate[], startsInMin: number): Slot {
  return {
    id:           "slot-demo-001",
    timeLabel:    "Mon 14:30",
    startsInMin,
    provider:     "Dr. Weber",
    service:      "MRI",
    status:       "OPEN",
    fillMode:     FILL_MODE,
    waveSize:     1,
    attempts:     0,
    attemptsTotal: candidates.filter(c => c.eligible).length,
    lastEvent:    "Cancellation detected",
    needsAttention: false,
    reasoning:    "",
    qualitative:  { responseRate: "unknown", fillConfidence: "unknown" },
    candidates,
    timeline:     [],
  };
}

// ── Call simulation ───────────────────────────────────────────────────────

const PICKUP_RATE = 0.52;
const ACCEPT_RATE = 0.54;

function simulateCall(): "accepted" | "declined" | "no_answer" {
  if (!bool(PICKUP_RATE)) return "no_answer";
  if (!bool(ACCEPT_RATE)) return "declined";
  return "accepted";
}

// ── Terminal formatting ───────────────────────────────────────────────────

const W = 62;
const line  = (ch = "─") => ch.repeat(W);
const box   = (title: string) => `\n${"━".repeat(4)} ${title} ${"━".repeat(Math.max(0, W - 6 - title.length))}\n`;
const check = "✓";
const cross = "✗";
const dot   = "·";

function pad(s: string | number, n: number, r = false) {
  const str = String(s);
  return r ? str.padStart(n) : str.padEnd(n);
}

// ── Main ──────────────────────────────────────────────────────────────────

console.log(`\n╔${"═".repeat(W - 2)}╗`);
console.log(`║${" OpenSlot AI — Algorithm Demo".padEnd(W - 2)}║`);
console.log(`╚${"═".repeat(W - 2)}╝`);

console.log(`\n  Slot       : MRI, Dr. Weber  (Mon 14:30)`);
console.log(`  Lead time  : ${SLOT_LEAD_MIN} minutes until start`);
console.log(`  Fill mode  : ${FILL_MODE} ${
  FILL_MODE === "Patient" ? "(target 65% fill probability per slot)" :
  FILL_MODE === "Balanced" ? "(target 80% fill probability per slot)" :
  "(target 92% fill probability per slot)"
}`);
console.log(`  RNG seed   : ${SEED}`);

// ── Step 1: Build + rank candidates ──────────────────────────────────────

const candidates = buildCandidates();
const slot = makeSlot(candidates, SLOT_LEAD_MIN);
const ranked = rankCandidates(slot);

console.log(box("Step 1 — Rank Candidates"));

const eligible   = candidates.filter(c => c.eligible);
const ineligible = candidates.filter(c => !c.eligible);

console.log(`  ${candidates.length} patients on MRI waitlist`);
console.log(`  ${eligible.length} eligible  ·  ${ineligible.length} skipped by consent/cooldown filters\n`);

console.log(`  ${pad("Rank", 6)}${pad("Patient", 22)}${pad("Wait", 6)}${pad("Reason", 34)}${pad("Score", 6)}`);
console.log(`  ${line("-")}`);

for (const c of ranked) {
  const score = c.score.toFixed(2);
  const reason = c.matchReason.length > 32 ? c.matchReason.slice(0, 31) + "…" : c.matchReason;
  console.log(`  ${pad("#" + c.rank, 6)}${pad(c.name, 22)}${pad(c.waitDays + "d", 6)}${pad(reason, 34)}${pad(score, 6)}`);
}

if (ineligible.length) {
  console.log();
  for (const c of ineligible) {
    console.log(`  [SKIP] ${c.name.padEnd(22)} — ${c.skipReason}`);
  }
}

// ── Step 2: Wave sizing ───────────────────────────────────────────────────

console.log(box("Step 2 — Calculate Wave Size"));

const CALL_TIMEOUT = 5;
const BUFFER       = 2;
const WAVE_MIN     = CALL_TIMEOUT + BUFFER;

const p0 = estimateSlotCallSuccess(slot);
const ws0 = calculateWaveSize({
  p: p0,
  usableTimeMin: SLOT_LEAD_MIN,
  fillMode: FILL_MODE,
  callTimeoutMin: CALL_TIMEOUT,
  bufferMin: BUFFER,
});

const targetFill = FILL_MODE === "Patient" ? 0.65 : FILL_MODE === "Balanced" ? 0.80 : 0.92;
const kNeeded = Math.ceil(Math.log(1 - targetFill) / Math.log(1 - Math.max(p0, 0.01)));
const wavesPossible = Math.floor(SLOT_LEAD_MIN / WAVE_MIN);

console.log(`  p (cold start)          : ${p0.toFixed(2)}`);
console.log(`  Target fill probability : ${(targetFill * 100).toFixed(0)}%  (${FILL_MODE} mode)`);
console.log(`  K_needed                : ⌈log(${1 - targetFill}) / log(${(1 - p0).toFixed(2)})⌉ = ${kNeeded} attempts`);
console.log(`  Waves possible          : ⌊${SLOT_LEAD_MIN} / ${WAVE_MIN}⌋ = ${wavesPossible} waves`);
console.log(`\n  → wave_size = ${ws0.waveSize}  (${ws0.explanation})`);

// ── Step 3: Fill loop ─────────────────────────────────────────────────────

console.log(box("Step 3 — Fill Loop"));

const workingCandidates: RankedCandidate[] = ranked.map(c => ({ ...c }));
let timeLeft  = SLOT_LEAD_MIN;
let waveNum   = 0;
let totalCalls = 0;
let booked: string | null = null;

while (timeLeft >= CALL_TIMEOUT) {
  const updatedSlot: Slot = { ...slot, candidates: workingCandidates, startsInMin: timeLeft };
  const p = estimateSlotCallSuccess(updatedSlot);
  const reranked = rankCandidates(updatedSlot);
  const wave = reranked.filter(eligibleForNextWave).slice(
    0,
    calculateWaveSize({ p, usableTimeMin: timeLeft, fillMode: FILL_MODE, callTimeoutMin: CALL_TIMEOUT, bufferMin: BUFFER }).waveSize,
  );

  if (!wave.length) {
    console.log(`  [Wave ${++waveNum}]  No eligible candidates — escalating to front desk.`);
    break;
  }

  waveNum++;
  timeLeft -= WAVE_MIN;
  totalCalls += wave.length;

  const accepted: string[] = [];
  for (const c of wave) {
    const outcome = simulateCall();
    const tracked = workingCandidates.find(x => x.id === c.id);
    if (tracked) tracked.contactStatus = outcome;
    const icon = outcome === "accepted" ? check : outcome === "declined" ? cross : dot;
    const label = wave.length > 1 ? `[Wave ${waveNum}/${wave.indexOf(c) + 1}]` : `[Wave ${waveNum}]`;
    console.log(`  ${label.padEnd(12)} ${c.name.padEnd(22)} ${dot.repeat(4)} ${outcome.padEnd(12)} ${icon}  (${Math.max(0, timeLeft)} min left)`);
    if (outcome === "accepted") accepted.push(c.name);
  }

  if (accepted.length) {
    booked = accepted[0];
    if (accepted.length > 1) {
      console.log(`\n  Race condition: ${accepted.length} accepted simultaneously.`);
      console.log(`  Atomic booking: ${booked} wins.`);
      for (const loser of accepted.slice(1)) {
        console.log(`  Runner-up bump applied to ${loser} — first priority next matching slot.`);
      }
    }
    break;
  }
}

if (!booked && timeLeft < CALL_TIMEOUT) {
  console.log(`\n  Time expired with no booking — escalating to front desk.`);
}

// ── Result ────────────────────────────────────────────────────────────────

console.log(box("Result"));

if (booked) {
  const elapsed = SLOT_LEAD_MIN - timeLeft;
  console.log(`  Status       : BOOKED ${check}`);
  console.log(`  Patient      : ${booked}`);
  console.log(`  Time to fill : ${elapsed} minutes`);
  console.log(`  Calls placed : ${totalCalls}`);
  console.log(`  Waves used   : ${waveNum}`);
} else {
  console.log(`  Status       : ESCALATED — no booking in time`);
  console.log(`  Calls placed : ${totalCalls}`);
}

console.log(`\n${"━".repeat(W)}`);
console.log(`  Monte Carlo results (50 trials): lib/sim-results.ts`);
console.log(`  Algorithm source               : src/lib/fonio/backend/algorithm.ts`);
console.log(`${"━".repeat(W)}\n`);

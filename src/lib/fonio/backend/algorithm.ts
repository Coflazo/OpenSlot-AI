import type { Candidate, FillMode, Slot } from "../types";

export const targetFillByMode: Record<FillMode, number> = {
  Patient: 0.65,
  Balanced: 0.8,
  Aggressive: 0.92,
};

export interface WaveSizeInput {
  p: number;
  usableTimeMin: number;
  fillMode?: FillMode;
  targetFill?: number;
  callTimeoutMin?: number;
  bufferMin?: number;
}

export interface WaveSizeResult {
  waveSize: number;
  kNeeded: number;
  wavesPossible: number;
  targetFill: number;
  p: number;
  explanation: string;
}

export interface RankedCandidate extends Candidate {
  score: number;
  scoreParts: {
    wait: number;
    acceptance: number;
    priority: number;
    preference: number;
    cooldownPenalty: number;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateWaveSize(input: WaveSizeInput): WaveSizeResult {
  const p = clamp(input.p, 0.01, 0.95);
  const targetFill =
    input.targetFill ?? targetFillByMode[input.fillMode ?? "Balanced"] ?? targetFillByMode.Balanced;
  const callTimeoutMin = input.callTimeoutMin ?? 5;
  const bufferMin = input.bufferMin ?? 2;
  const waveDuration = Math.max(callTimeoutMin + bufferMin, 1);
  const wavesPossible = Math.max(Math.floor(input.usableTimeMin / waveDuration), 0);
  const kNeeded = Math.max(Math.ceil(Math.log(1 - targetFill) / Math.log(1 - p)), 1);

  if (wavesPossible >= kNeeded) {
    return {
      waveSize: 1,
      kNeeded,
      wavesPossible,
      targetFill,
      p,
      explanation: "Enough runway remains, so call one candidate at a time.",
    };
  }

  const waveSize = Math.max(Math.ceil(kNeeded / Math.max(wavesPossible, 1)), 1);

  return {
    waveSize,
    kNeeded,
    wavesPossible,
    targetFill,
    p,
    explanation: `Only ${wavesPossible || 1} wave${wavesPossible === 1 ? "" : "s"} fit before the slot, so widen to ${waveSize}.`,
  };
}

export function estimateSlotCallSuccess(slot: Slot) {
  const completed = slot.candidates.filter((c) =>
    ["accepted", "booked", "runner_up", "declined", "no_answer"].includes(c.contactStatus),
  );
  if (completed.length < 3) return 0.3;

  const successes = completed.filter((c) =>
    ["accepted", "booked", "runner_up"].includes(c.contactStatus),
  ).length;

  return clamp(successes / completed.length, 0.1, 0.75);
}

export function rankCandidates(slot: Slot): RankedCandidate[] {
  const maxWait = Math.max(...slot.candidates.map((c) => c.waitDays), 1);

  return slot.candidates
    .map((candidate) => {
      const wait = (candidate.waitDays / maxWait) * 25;
      const acceptance = acceptanceScore(candidate);
      const priority = candidate.runnerUpBoost ? 35 : 0;
      const preference = preferenceScore(candidate);
      const cooldownPenalty =
        candidate.contactStatus === "skipped" || candidate.skipReason ? 30 : 0;

      return {
        ...candidate,
        score: Math.round(wait + acceptance + priority + preference - cooldownPenalty),
        scoreParts: {
          wait: Math.round(wait),
          acceptance,
          priority,
          preference,
          cooldownPenalty,
        },
      };
    })
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.score - a.score;
    })
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

export function eligibleForNextWave(candidate: Candidate) {
  if (!candidate.eligible) return false;
  return candidate.contactStatus === "not_contacted";
}

function acceptanceScore(candidate: Candidate) {
  if (candidate.contactStatus === "no_answer") return 4;
  if (candidate.contactStatus === "declined") return 0;
  if (candidate.contactStatus === "ringing") return 8;
  if (candidate.contactStatus === "accepted" || candidate.contactStatus === "booked") return 20;
  return 12;
}

function preferenceScore(candidate: Candidate) {
  const reason = candidate.matchReason.toLowerCase();
  if (reason.includes("matches")) return 20;
  if (reason.includes("preference")) return 16;
  if (reason.includes("provider")) return 10;
  return 6;
}

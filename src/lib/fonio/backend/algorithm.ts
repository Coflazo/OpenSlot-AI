/**
 * OpenSlot AI — Waitlist Slot Fill Algorithm
 *
 * Implements the wave-sizing and candidate-ranking logic described in
 * fonio_waitlist_fill_algorithm.md.
 *
 * Core principle: call sequentially when there is time; widen into parallel
 * waves only as urgency increases. Fairness is the default; efficiency is the
 * emergency response.
 */

import type { Candidate, FillMode, Slot } from "../types.js";

export type RankedCandidate = Candidate & { score: number };

// ---------------------------------------------------------------------------
// Fill-mode → target fill probability mapping
// ---------------------------------------------------------------------------

const TARGET_FILL: Record<FillMode, number> = {
  Patient:    0.65,
  Balanced:   0.80,
  Aggressive: 0.92,
};

// ---------------------------------------------------------------------------
// rankCandidates
//
// Scores every eligible candidate for a specific slot using a weighted sum:
//
//   score = w_wait     * normalized_wait_time
//         + w_pref     * preference_match
//         + w_priority * business_priority   (VIP / runner-up boost)
//         - w_cooldown * recently_contacted_penalty
//
// Ineligible candidates are excluded before scoring.
// Returns candidates sorted best-first, rank index set from 1.
// ---------------------------------------------------------------------------

export function rankCandidates(slot: Slot): RankedCandidate[] {
  const eligible = slot.candidates.filter((c) => c.eligible);

  if (eligible.length === 0) return [];

  const maxWait = Math.max(...eligible.map((c) => c.waitDays), 1);

  const scored = eligible.map((c): RankedCandidate => {
    const normalizedWait  = c.waitDays / maxWait;                    // 0–1
    const preferenceMatch = scorePreference(c.matchReason);          // 0–1
    const priorityScore   = c.runnerUpBoost ? 1.0 : 0.0;            // 0 or 1
    const cooldownPenalty = isRecentlyContacted(c.contactStatus)
      ? 0.5
      : 0;

    const score =
      0.30 * normalizedWait +
      0.35 * preferenceMatch +
      0.25 * priorityScore -
      0.10 * cooldownPenalty;

    return { ...c, score, rank: 0 };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

// ---------------------------------------------------------------------------
// eligibleForNextWave
//
// A candidate is blocked from the next wave if they already accepted
// (already booked) or have declined in this slot attempt. Candidates who
// never answered remain eligible — the algorithm will try them again.
// ---------------------------------------------------------------------------

export function eligibleForNextWave(candidate: RankedCandidate): boolean {
  const blocked = new Set(["accepted", "declined", "booked"]);
  return !blocked.has(candidate.contactStatus);
}

// ---------------------------------------------------------------------------
// estimateSlotCallSuccess
//
// Estimates p = P(one call → booking) from observed outcomes on this slot.
// Cold start: 0.30 (reasonable outbound medical/dental default).
// Updates online using Laplace smoothing as outcomes arrive.
// ---------------------------------------------------------------------------

export function estimateSlotCallSuccess(slot: Slot): number {
  const contacted = slot.candidates.filter(
    (c) => c.contactStatus !== "not_contacted",
  );

  if (contacted.length === 0) return 0.30;

  const accepted = contacted.filter(
    (c) => c.contactStatus === "accepted" || c.contactStatus === "booked",
  ).length;

  // Laplace-smoothed estimate (add-0.5 smoothing)
  return Math.max(0.05, Math.min(0.95, (accepted + 0.5) / (contacted.length + 1)));
}

// ---------------------------------------------------------------------------
// calculateWaveSize
//
// Implements the core wave-size function from the spec (sections 8–10):
//
//   K_needed       = ceil(log(1 - target_fill) / log(1 - p))
//   waves_possible = floor(usableTimeMin / (callTimeoutMin + bufferMin))
//
//   if waves_possible >= K_needed  →  wave_size = 1   (sequential, fair)
//   else                           →  wave_size = ceil(K_needed / waves_possible)
// ---------------------------------------------------------------------------

export function calculateWaveSize(params: {
  p: number;
  usableTimeMin: number;
  fillMode: FillMode;
  callTimeoutMin: number;
  bufferMin: number;
}): { waveSize: number; explanation: string } {
  const { p, usableTimeMin, fillMode, callTimeoutMin, bufferMin } = params;

  const targetFill   = TARGET_FILL[fillMode];
  const waveMin      = callTimeoutMin + bufferMin;
  const wavesPossible = Math.max(0, Math.floor(usableTimeMin / waveMin));

  // Guard against p = 0 or p = 1
  const safeP = Math.max(0.01, Math.min(0.99, p));

  const kNeeded = Math.ceil(
    Math.log(1 - targetFill) / Math.log(1 - safeP),
  );

  if (wavesPossible === 0) {
    return {
      waveSize: kNeeded,
      explanation: `Slot starts in <${waveMin} min; calling ${kNeeded} candidate(s) in parallel to hit ${(targetFill * 100).toFixed(0)}% fill target`,
    };
  }

  if (wavesPossible >= kNeeded) {
    return {
      waveSize: 1,
      explanation: `${wavesPossible} waves available vs ${kNeeded} needed; calling one candidate at a time`,
    };
  }

  const size = Math.ceil(kNeeded / wavesPossible);
  return {
    waveSize: size,
    explanation: `${wavesPossible} wave(s) left, ${kNeeded} attempts needed; widening to ${size} per wave`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scorePreference(matchReason: string): number {
  const r = matchReason.toLowerCase();
  if (r.includes("vip"))                              return 1.0;
  if (r.includes("runner-up") || r.includes("runner_up")) return 0.95;
  if (r.includes("preference") || r.includes("preferred")) return 0.85;
  if (r.includes("match"))                            return 0.65;
  return 0.30;
}

function isRecentlyContacted(status: string): boolean {
  return status === "declined" || status === "no_answer";
}

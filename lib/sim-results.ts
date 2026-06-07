/**
 * Static results from 50 Monte Carlo trials of the OpenSlot AI algorithm.
 *
 * Source: OpenSlot-AI-sim, run with `npm run simulate:many` (--runs 50).
 * Seeds 2026–2075, 5-week simulation horizon per trial.
 * Algorithm: smart wave-sizing + upgrade cascade (Balanced mode).
 * Baseline: naive FIFO, wave_size always 1, no upgrade cascade.
 *
 * To reproduce: cd ../OpenSlot-AI-sim && npm run simulate:many
 */

export const SIM_RESULTS = {
  runs: 50,

  // ── Aggregate: Algorithm ─────────────────────────────────────────────────
  algo: {
    fillRate: 0.8556,         // 85.6%
    baselineFillRate: 0.8087, // 80.9%  (naive FIFO, same seeds)
    fillRateDeltaPp: 4.7,     // +4.7 percentage-point lift

    // Totals across all 50 trials
    totalSlots:          63863,
    cancellations:       7613,
    noShows:             1373,
    filledSlots:         7688,
    lostSlots:           1291,
    escalations:          394,
    callsPlaced:         48306,
    acceptedCalls:       18645,
    declinedCalls:       12480,
    noAnswerCalls:       17181,
    doubleAcceptConflicts:   2,  // only 2 race conditions in 50 runs
    runnerUpBumpsCreated: 1777,
    runnerUpBumpsHonored:  827,
    upgradesOffered:     23254,
    upgradesAccepted:     9080,
    invariantFailures:       0,  // zero double-booking violations

    // Derived rates
    avgCallsPerRecoveredSlot: 6.28,
    callAcceptanceRate:       0.386,  // 38.6% per call
    runnerUpHonorRate:        0.465,  // 46.5% of bumped patients recovered
    upgradeAcceptRate:        0.390,  // 39.0% of upgrade offers accepted

    // Baseline totals (for comparison)
    baselineLostSlots:       1724,
    lostSlotReduction:       0.251, // 25.1% fewer lost slots vs baseline
  },

  // ── Per-trial fill rates (50 values, one per seed) ────────────────────────
  // Index 0 = seed 2026, index 49 = seed 2075
  perTrialFillRates: [
    87.2, 88.6, 87.3, 83.5, 82.2, 84.8, 82.4, 81.6, 86.4, 88.8,
    83.4, 83.1, 78.1, 89.9, 90.9, 85.7, 79.5, 81.8, 91.6, 86.8,
    85.8, 87.7, 88.3, 92.4, 80.2, 92.6, 86.7, 83.9, 90.8, 88.6,
    80.3, 83.6, 88.8, 84.1, 84.2, 88.1, 91.0, 84.4, 78.4, 86.9,
    82.6, 87.4, 85.1, 86.6, 83.1, 94.4, 84.4, 81.6, 85.9, 82.8,
  ],

  // ── Distribution buckets for histogram ───────────────────────────────────
  fillRateBuckets: [
    { range: "78–80%", count: 3 },
    { range: "80–82%", count: 5 },
    { range: "82–84%", count: 10 },
    { range: "84–86%", count: 9 },
    { range: "86–88%", count: 9 },
    { range: "88–90%", count: 7 },
    { range: "90–92%", count: 4 },
    { range: "92–95%", count: 3 },
  ],

  // ── Percentiles ───────────────────────────────────────────────────────────
  percentiles: {
    min:  78.1,
    p10:  80.3,
    p25:  83.1,
    p50:  85.7,  // median
    p75:  88.3,
    p90:  90.9,
    max:  94.4,
    mean: 85.7,
  },

  // ── Scenario rows (for comparison table) ─────────────────────────────────
  // "filled" = slots filled per 5-week trial, "lost" = slots lost per trial
  scenarios: [
    { label: "FIFO baseline (no AI)",   fillRate: "80.9%", filled: "146 / 5 wks", lost: "34.5" },
    { label: "P10 — Pessimistic trial", fillRate: "80.3%", filled: "151 / 5 wks", lost: "36" },
    { label: "P50 — Median trial",      fillRate: "85.7%", filled: "174 / 5 wks", lost: "29" },
    { label: "P90 — Optimistic trial",  fillRate: "90.9%", filled: "170 / 5 wks", lost: "17" },
  ],

  // ── Notable trials ────────────────────────────────────────────────────────
  worstTrial:  { seed: 2038, fillRate: 78.1, lostSlots: 43, note: "High short-notice cancellation pressure" },
  bestTrial:   { seed: 2071, fillRate: 94.4, lostSlots:  9, note: "Upgrade cascade fired well; strong response rates" },
} as const;

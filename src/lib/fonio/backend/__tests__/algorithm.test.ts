import { describe, expect, it } from "vitest";

import { initialSlots } from "../../mock-data";
import type { Slot } from "../../types";
import { calculateWaveSize, estimateSlotCallSuccess, rankCandidates } from "../algorithm";

describe("calculateWaveSize", () => {
  it("keeps calls sequential when enough waves remain", () => {
    const result = calculateWaveSize({
      p: 0.3,
      usableTimeMin: 60,
      fillMode: "Balanced",
      callTimeoutMin: 5,
      bufferMin: 5,
    });

    expect(result.kNeeded).toBe(5);
    expect(result.wavesPossible).toBe(6);
    expect(result.waveSize).toBe(1);
    expect(result.explanation).toContain("Enough runway");
  });

  it("widens the wave when time is tight", () => {
    const result = calculateWaveSize({
      p: 0.3,
      usableTimeMin: 10,
      fillMode: "Balanced",
      callTimeoutMin: 5,
      bufferMin: 5,
    });

    expect(result.kNeeded).toBe(5);
    expect(result.wavesPossible).toBe(1);
    expect(result.waveSize).toBe(5);
  });

  it("uses aggression mode as target fill probability", () => {
    const patient = calculateWaveSize({ p: 0.3, usableTimeMin: 10, fillMode: "Patient" });
    const aggressive = calculateWaveSize({ p: 0.3, usableTimeMin: 10, fillMode: "Aggressive" });

    expect(patient.targetFill).toBe(0.65);
    expect(aggressive.targetFill).toBe(0.92);
    expect(aggressive.kNeeded).toBeGreaterThan(patient.kNeeded);
  });

  it("clamps unrealistic probability inputs", () => {
    const low = calculateWaveSize({ p: 0, usableTimeMin: 0, fillMode: "Balanced" });
    const high = calculateWaveSize({ p: 1, usableTimeMin: 0, fillMode: "Balanced" });

    expect(low.p).toBe(0.01);
    expect(high.p).toBe(0.95);
    expect(low.waveSize).toBeGreaterThan(1);
    expect(high.waveSize).toBe(1);
  });
});

describe("rankCandidates", () => {
  it("keeps eligible candidates ahead of ineligible candidates", () => {
    const ranked = rankCandidates(cloneSlot("s-1030"));

    const firstIneligibleIndex = ranked.findIndex((candidate) => !candidate.eligible);
    const lastEligibleIndex = ranked.reduce(
      (last, candidate, index) => (candidate.eligible ? index : last),
      -1,
    );

    expect(firstIneligibleIndex).toBeGreaterThan(lastEligibleIndex);
  });

  it("surfaces durable runner-up priority when the candidate is eligible", () => {
    const ranked = rankCandidates(cloneSlot("s-1330"));

    expect(ranked[0].name).toBe("Jonas Pirker");
    expect(ranked[0].runnerUpBoost).toBe(true);
    expect(ranked[0].scoreParts.priority).toBeGreaterThan(0);
  });
});

describe("estimateSlotCallSuccess", () => {
  it("uses the cold-start default before enough outcomes exist", () => {
    expect(estimateSlotCallSuccess(cloneSlot("s-1330"))).toBe(0.3);
  });

  it("updates from observed outcomes once enough calls complete", () => {
    const estimate = estimateSlotCallSuccess(cloneSlot("s-1030"));

    expect(estimate).toBeGreaterThanOrEqual(0.1);
    expect(estimate).toBeLessThanOrEqual(0.75);
  });
});

function cloneSlot(slotId: string): Slot {
  const slot = initialSlots.find((item) => item.id === slotId);
  if (!slot) throw new Error(`Missing mock slot ${slotId}`);
  return JSON.parse(JSON.stringify(slot)) as Slot;
}

import { beforeEach, describe, expect, it } from "vitest";

import {
  attemptBooking,
  dispatchNextWave,
  getSlot,
  openSlot,
  recordCallOutcome,
  resetBackendState,
  setSlotPaused,
} from "../store.server";

describe("booking store pressure tests", () => {
  beforeEach(() => {
    resetBackendState();
  });

  it("dispatches a backend-selected wave and books the first accepted candidate", () => {
    const dispatch = dispatchNextWave("s-1330");
    expect(dispatch.ok).toBe(true);
    expect(dispatch.wave?.id).toBe("s-1330:wave:1");

    const candidate = dispatch.slot.candidates.find((item) => item.name === "Jonas Pirker");
    expect(candidate).toBeDefined();

    const result = recordCallOutcome({
      slotId: "s-1330",
      candidateId: candidate!.id,
      waveId: dispatch.wave!.id,
      outcome: "accepted",
      providerEventId: "evt-accepted-1",
    });

    expect(result.booking?.ok).toBe(true);
    expect(getSlot("s-1330")?.status).toBe("BOOKED");
    expect(getSlot("s-1330")?.bookedCustomer).toBe("Jonas Pirker");
  });

  it("allows exactly one winner and turns later accepts into runner-up conflicts", () => {
    const dispatch = dispatchNextWave("s-1330", 2);
    expect(dispatch.ok).toBe(true);

    const [first, second] = dispatch.slot.candidates.filter((candidate) =>
      dispatch.wave!.candidates.some((waveCandidate) => waveCandidate.name === candidate.name),
    );

    const firstResult = recordCallOutcome({
      slotId: "s-1330",
      candidateId: first.id,
      waveId: dispatch.wave!.id,
      outcome: "accepted",
      providerEventId: "evt-double-1",
    });
    const secondResult = recordCallOutcome({
      slotId: "s-1330",
      candidateId: second.id,
      waveId: dispatch.wave!.id,
      outcome: "accepted",
      providerEventId: "evt-double-2",
    });

    expect(firstResult.booking?.ok).toBe(true);
    expect(secondResult.booking?.ok).toBe(false);
    expect(secondResult.booking?.code).toBe("BOOKING_CONFLICT");
    expect(getSlot("s-1330")?.bookedCustomer).toBe(first.name);
    expect(getSlot("s-1330")?.runnerUp?.runnerUps.at(-1)?.name).toBe(second.name);
  });

  it("dedupes duplicate provider webhooks by providerEventId", () => {
    const dispatch = dispatchNextWave("s-1330");
    const candidate = dispatch.slot.candidates.find((item) => item.name === "Jonas Pirker")!;

    const first = recordCallOutcome({
      slotId: "s-1330",
      candidateId: candidate.id,
      waveId: dispatch.wave!.id,
      outcome: "accepted",
      providerEventId: "evt-duplicate",
    });
    const duplicate = recordCallOutcome({
      slotId: "s-1330",
      candidateId: candidate.id,
      waveId: dispatch.wave!.id,
      outcome: "accepted",
      providerEventId: "evt-duplicate",
    });

    expect(first.booking?.ok).toBe(true);
    expect(duplicate.duplicate).toBe(true);
    expect(getSlot("s-1330")?.runnerUp).toBeUndefined();
  });

  it("pause new waves does not invalidate calls already in progress", () => {
    const dispatch = dispatchNextWave("s-1330");
    const candidate = dispatch.slot.candidates.find((item) => item.name === "Jonas Pirker")!;

    const pause = setSlotPaused("s-1330", true);
    expect(pause.ok).toBe(true);
    expect(pause.slot.status).toBe("OFFERING");
    expect(pause.slot.newWavesPaused).toBe(true);

    const accepted = recordCallOutcome({
      slotId: "s-1330",
      candidateId: candidate.id,
      waveId: dispatch.wave!.id,
      outcome: "accepted",
      providerEventId: "evt-paused-accept",
    });

    expect(accepted.booking?.ok).toBe(true);
    expect(getSlot("s-1330")?.bookedCustomer).toBe("Jonas Pirker");
  });

  it("blocks new dispatches while new waves are paused", () => {
    setSlotPaused("s-1330", true);
    const dispatch = dispatchNextWave("s-1330");

    expect(dispatch.ok).toBe(false);
    expect(dispatch.reason).toContain("paused");
    expect(dispatch.slot.status).toBe("PAUSED_NEW_WAVES");
  });

  it("rejects stale wave acceptances without creating fake runner-ups", () => {
    const dispatch = dispatchNextWave("s-1330");
    const candidate = dispatch.slot.candidates.find((item) => item.name === "Jonas Pirker")!;

    const stale = recordCallOutcome({
      slotId: "s-1330",
      candidateId: candidate.id,
      waveId: "stale-wave",
      outcome: "accepted",
      providerEventId: "evt-stale",
    });

    expect(stale.booking?.ok).toBe(false);
    expect(stale.booking?.code).toBe("STALE_WAVE");
    expect(getSlot("s-1330")?.runnerUp).toBeUndefined();
  });

  it("turns second manual booking into a booking conflict", () => {
    const first = attemptBooking({
      slotId: "s-1400",
      candidateName: "Manual Winner",
      source: "manual",
    });
    const second = attemptBooking({
      slotId: "s-1400",
      candidateName: "Manual Runner-Up",
      source: "manual",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.code).toBe("BOOKING_CONFLICT");
    expect(getSlot("s-1400")?.bookedCustomer).toBe("Manual Winner");
    expect(getSlot("s-1400")?.runnerUp?.runnerUps.at(-1)?.name).toBe("Manual Runner-Up");
  });

  it("escalates when an opened slot has no eligible candidates", () => {
    openSlot({
      id: "empty-slot",
      timeLabel: "16:00",
      startsInMin: 90,
      provider: "Dr. Empty",
      service: "Consultation",
      fillMode: "Balanced",
    });

    const dispatch = dispatchNextWave("empty-slot");

    expect(dispatch.ok).toBe(false);
    expect(dispatch.reason).toBe("No eligible candidates.");
    expect(getSlot("empty-slot")?.status).toBe("ESCALATED");
  });
});

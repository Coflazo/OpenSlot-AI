import { describe, expect, it } from "vitest";

import {
  acceptUpgrade,
  attemptBooking,
  dispatchNextWave,
  getSlot,
  resetBackendState,
  setSlotPaused,
} from "../store.server";
import {
  runDeterministicChaosScenario,
  runUpgradeCascadeScenario,
  verifyScheduleInvariants,
} from "../pressure-harness";

describe("appointment scheduling pressure suite", () => {
  it("runs the reusable upgrade cascade scenario", () => {
    const report = runUpgradeCascadeScenario();

    expect(report.name).toBe("upgrade-cascade");
    expect(report.summary.eventsRun).toBe(3);
    expect(getSlot("s-1330")?.status).toBe("BOOKED");
    expect(getSlot("s-1330")?.bookedCustomer).toBe("Anika Earlier");
    expect(getSlot("s-1400")?.status).toBe("OFFERING");
    expect(getSlot("s-1400")?.bookedCustomer).toBeUndefined();
    expect(report.events.map((event) => event.action)).toEqual([
      "seed later booking",
      "accept earlier-slot upgrade",
      "dispatch waitlist wave for released slot",
    ]);
  });

  it("keeps the old booking if the earlier target slot is already taken", () => {
    resetBackendState();

    const current = attemptBooking({
      slotId: "s-1400",
      candidateName: "Anika Earlier",
      source: "seed",
    });
    const target = attemptBooking({
      slotId: "s-1330",
      candidateName: "Target Winner",
      source: "seed",
    });

    expect(current.ok).toBe(true);
    expect(target.ok).toBe(true);

    const upgrade = acceptUpgrade({
      patientName: "Anika Earlier",
      currentSlotId: "s-1400",
      targetSlotId: "s-1330",
    });

    expect(upgrade.ok).toBe(false);
    expect(upgrade.code).toBe("TARGET_ALREADY_BOOKED");
    expect(getSlot("s-1400")?.bookedCustomer).toBe("Anika Earlier");
    expect(getSlot("s-1330")?.bookedCustomer).toBe("Target Winner");
    expect(getSlot("s-1330")?.runnerUp?.runnerUps.at(-1)?.name).toBe("Anika Earlier");
    verifyScheduleInvariants();
  });

  it("treats duplicate upgrade accepts as idempotent after the move commits", () => {
    resetBackendState();
    attemptBooking({
      slotId: "s-1400",
      candidateName: "Anika Earlier",
      source: "seed",
    });

    const first = acceptUpgrade({
      patientName: "Anika Earlier",
      currentSlotId: "s-1400",
      targetSlotId: "s-1330",
    });
    const duplicate = acceptUpgrade({
      patientName: "Anika Earlier",
      currentSlotId: "s-1400",
      targetSlotId: "s-1330",
    });

    expect(first.ok).toBe(true);
    expect(duplicate.ok).toBe(true);
    expect(duplicate.duplicate).toBe(true);
    expect(getSlot("s-1330")?.bookedCustomer).toBe("Anika Earlier");
    expect(getSlot("s-1400")?.status).toBe("OPEN");
    verifyScheduleInvariants();
  });

  it("survives a deterministic chaos run without breaking schedule invariants", () => {
    const report = runDeterministicChaosScenario(2026, 40);

    expect(report.name).toBe("deterministic-chaos");
    expect(report.seed).toBe(2026);
    expect(report.summary.eventsRun).toBeGreaterThan(2);
    expect(report.events.some((event) => event.action.includes("dispatch"))).toBe(true);
    expect(report.events.some((event) => event.action.includes("call outcome"))).toBe(true);
    verifyScheduleInvariants();
  });

  it("can still fill a released slot from the waitlist after an upgrade", () => {
    const report = runUpgradeCascadeScenario();

    expect(report.events.at(-1)?.action).toBe("dispatch waitlist wave for released slot");
    expect(getSlot("s-1400")?.status).toBe("OFFERING");
    expect(getSlot("s-1400")?.activeWave?.candidates.length).toBeGreaterThan(0);

    const wave = getSlot("s-1400")?.activeWave;
    expect(wave?.candidates[0].state).toBe("ringing");
    verifyScheduleInvariants();
  });

  it("blocks dispatching a released slot while new waves are paused", () => {
    runUpgradeCascadeScenario();
    const released = getSlot("s-1400");
    expect(released?.status).toBe("OFFERING");

    resetBackendState();
    attemptBooking({
      slotId: "s-1400",
      candidateName: "Anika Earlier",
      source: "seed",
    });
    acceptUpgrade({
      patientName: "Anika Earlier",
      currentSlotId: "s-1400",
      targetSlotId: "s-1330",
    });

    const paused = getSlot("s-1400");
    expect(paused?.status).toBe("OPEN");
    const pause = setSlotPaused("s-1400", true);
    expect(pause.ok).toBe(true);

    const dispatch = dispatchNextWave("s-1400");
    expect(dispatch.ok).toBe(false);
    expect(dispatch.reason).toContain("paused");
    verifyScheduleInvariants();
  });
});

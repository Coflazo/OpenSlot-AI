import type { CallOutcome, Slot } from "../types";
import {
  acceptUpgrade,
  attemptBooking,
  dispatchNextWave,
  getBackendState,
  getSlot,
  recordCallOutcome,
  resetBackendState,
  setSlotPaused,
  type CallOutcomeInput,
} from "./store.server";

export interface PressureEvent {
  step: number;
  action: string;
  slotId: string;
  status: Slot["status"];
  bookedCustomer?: string;
  note?: string;
}

export interface PressureReport {
  name: string;
  seed?: number;
  events: PressureEvent[];
  summary: {
    slotsChecked: number;
    eventsRun: number;
    bookedSlots: number;
    runnerUpSlots: number;
  };
}

export function runUpgradeCascadeScenario(): PressureReport {
  resetBackendState();
  const events: PressureEvent[] = [];

  const currentBooking = attemptBooking({
    slotId: "s-1400",
    candidateName: "Anika Earlier",
    source: "seed",
  });
  pushEvent(events, "seed later booking", "s-1400", currentBooking.message);
  verifyScheduleInvariants();

  const upgrade = acceptUpgrade({
    patientName: "Anika Earlier",
    currentSlotId: "s-1400",
    targetSlotId: "s-1330",
  });
  pushEvent(events, "accept earlier-slot upgrade", "s-1330", upgrade.message);
  verifyScheduleInvariants();

  const releasedFill = dispatchNextWave("s-1400");
  pushEvent(events, "dispatch waitlist wave for released slot", "s-1400", releasedFill.reason);
  verifyScheduleInvariants();

  return buildReport("upgrade-cascade", events);
}

export function runDeterministicChaosScenario(seed = 2026, steps = 40): PressureReport {
  resetBackendState();
  const random = seededRandom(seed);
  const events: PressureEvent[] = [];
  const slotId = "s-1330";
  let previousOutcome: CallOutcomeInput | null = null;

  for (let step = 0; step < steps; step += 1) {
    const slot = requirePressureSlot(slotId);
    const roll = random();

    if (previousOutcome && roll < 0.12) {
      const duplicate = recordCallOutcome(previousOutcome);
      pushEvent(
        events,
        "duplicate provider webhook",
        slotId,
        duplicate.duplicate ? "deduped" : "processed",
      );
      verifyScheduleInvariants();
      continue;
    }

    if (slot.status === "OPEN") {
      const dispatch = dispatchNextWave(slotId, random() < 0.35 ? 2 : undefined);
      pushEvent(events, "dispatch wave", slotId, dispatch.reason);
      verifyScheduleInvariants();
      continue;
    }

    if (slot.status === "PAUSED_NEW_WAVES") {
      const resume = setSlotPaused(slotId, false);
      pushEvent(events, "resume new waves", slotId, resume.reason);
      verifyScheduleInvariants();
      continue;
    }

    if (slot.status === "OFFERING") {
      if (roll > 0.75 && !slot.newWavesPaused) {
        const pause = setSlotPaused(slotId, true);
        pushEvent(events, "pause during active wave", slotId, pause.reason);
      }

      const ringing =
        slot.activeWave?.candidates.filter((candidate) => candidate.state === "ringing") ?? [];
      if (!ringing.length) {
        pushEvent(events, "no ringing candidates", slotId);
        verifyScheduleInvariants();
        continue;
      }

      const waveCandidate = ringing[Math.floor(random() * ringing.length)];
      const candidate = slot.candidates.find((item) => item.name === waveCandidate.name);
      if (!candidate || !slot.activeWave?.id) {
        pushEvent(events, "missing active candidate", slotId);
        verifyScheduleInvariants();
        continue;
      }

      const outcome = chooseOutcome(random());
      previousOutcome = {
        slotId,
        candidateId: candidate.id,
        waveId: slot.activeWave.id,
        outcome,
        providerEventId: `pressure-${seed}-${step}`,
      };
      const recorded = recordCallOutcome(previousOutcome);
      pushEvent(
        events,
        `call outcome: ${outcome}`,
        slotId,
        recorded.booking?.message ?? recorded.reason,
      );
      verifyScheduleInvariants();
      continue;
    }

    if (slot.status === "BOOKED") {
      const runnerUpCandidate = slot.candidates.find(
        (candidate) => candidate.eligible && candidate.name !== slot.bookedCustomer,
      );
      if (runnerUpCandidate) {
        const conflict = attemptBooking({
          slotId,
          candidateName: runnerUpCandidate.name,
          source: "manual",
        });
        pushEvent(events, "late manual accept after booking", slotId, conflict.message);
        verifyScheduleInvariants();
      }
      break;
    }

    pushEvent(events, `stop on ${slot.status}`, slotId);
    verifyScheduleInvariants();
    break;
  }

  return buildReport("deterministic-chaos", events, seed);
}

export function verifyScheduleInvariants() {
  const { slots } = getBackendState();
  const activeBookingKeys = new Map<string, string[]>();

  for (const slot of slots) {
    assert(
      slot.status === "BOOKED" || slot.bookedCustomer == null,
      `${slot.id} is ${slot.status} but still has bookedCustomer=${slot.bookedCustomer}`,
    );

    assert(
      slot.status !== "BOOKED" || Boolean(slot.bookedCustomer),
      `${slot.id} is BOOKED without a bookedCustomer`,
    );

    assert(
      slot.status !== "OPEN" || slot.activeWave == null,
      `${slot.id} is OPEN but still has an active wave`,
    );

    if (slot.status === "BOOKED" && slot.bookedCustomer) {
      const key = `${slot.bookedCustomer}:${slot.service}`;
      activeBookingKeys.set(key, [...(activeBookingKeys.get(key) ?? []), slot.id]);
    }

    if (slot.runnerUp && slot.status === "BOOKED") {
      assert(
        slot.runnerUp.winner === slot.bookedCustomer,
        `${slot.id} runner-up winner does not match booked customer`,
      );
    }
  }

  for (const [key, slotIds] of activeBookingKeys.entries()) {
    assert(slotIds.length === 1, `${key} has multiple active bookings: ${slotIds.join(", ")}`);
  }
}

function buildReport(name: string, events: PressureEvent[], seed?: number): PressureReport {
  const { slots } = getBackendState();
  return {
    name,
    seed,
    events,
    summary: {
      slotsChecked: slots.length,
      eventsRun: events.length,
      bookedSlots: slots.filter((slot) => slot.status === "BOOKED").length,
      runnerUpSlots: slots.filter((slot) => slot.runnerUp?.runnerUps.length).length,
    },
  };
}

function pushEvent(events: PressureEvent[], action: string, slotId: string, note?: string) {
  const slot = requirePressureSlot(slotId);
  events.push({
    step: events.length + 1,
    action,
    slotId,
    status: slot.status,
    bookedCustomer: slot.bookedCustomer,
    note,
  });
}

function chooseOutcome(value: number): CallOutcome {
  if (value < 0.28) return "accepted";
  if (value < 0.62) return "no_answer";
  return "declined";
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function requirePressureSlot(slotId: string) {
  const slot = getSlot(slotId);
  if (!slot) throw new Error(`Pressure harness missing slot ${slotId}`);
  return slot;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

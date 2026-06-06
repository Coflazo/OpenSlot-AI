import { initialSlots, initialWaitlist } from "../mock-data";
import type { CallOutcome, Slot, SlotStatus, WaitlistEntry } from "../types";
import {
  calculateWaveSize,
  eligibleForNextWave,
  estimateSlotCallSuccess,
  rankCandidates,
} from "./algorithm";
import { fetchWaitlistEntries, fetchSlots, recordCallAttempt, createBooking } from "../../supabase.server";

type BookingSource = "call_webhook" | "manual" | "seed";

export interface AttemptBookingInput {
  slotId: string;
  candidateId?: string;
  candidateName?: string;
  waveId?: string;
  source: BookingSource;
}

export interface CallOutcomeInput {
  slotId: string;
  candidateId: string;
  outcome: CallOutcome;
  providerEventId?: string;
  waveId?: string;
}

export interface SlotOpenedInput {
  id: string;
  timeLabel: string;
  startsInMin: number;
  provider: string;
  service: string;
  fillMode?: Slot["fillMode"];
}

// TODO: Initialize from Supabase on server startup
// For now, using mock data as fallback
let slots: Slot[] = clone(initialSlots);
let waitlist: WaitlistEntry[] = clone(initialWaitlist);
const processedEvents = new Set<string>();

/**
 * Initialize data from Supabase
 * Call this once on server startup
 */
export async function initializeFromSupabase() {
  try {
    console.log("[Store] Initializing from Supabase...");
    // TODO: Implement full data transformation from Supabase
    // For now, keeping mock data as fallback
  } catch (error) {
    console.error("[Store] Failed to initialize from Supabase:", error);
  }
}

export function getBackendState() {
  return {
    slots,
    waitlist,
  };
}

export function getSlot(slotId: string) {
  return slots.find((slot) => slot.id === slotId) ?? null;
}

export function openSlot(input: SlotOpenedInput) {
  const existing = getSlot(input.id);
  if (existing) return existing;

  const slot: Slot = {
    id: input.id,
    timeLabel: input.timeLabel,
    startsInMin: input.startsInMin,
    provider: input.provider,
    service: input.service,
    status: "OPEN",
    fillMode: input.fillMode ?? "Balanced",
    waveSize: 1,
    attempts: 0,
    attemptsTotal: 4,
    lastEvent: "Slot opened from external integration",
    needsAttention: false,
    reasoning: "Calling one at a time because there is enough runway.",
    qualitative: { responseRate: "Cold start", fillConfidence: "On track" },
    timeline: [
      {
        id: eventId(),
        at: "now",
        kind: "slot_opened",
        message: "Slot opened from calendar/cancellation integration",
      },
    ],
    candidates: [],
  };

  slots.unshift(slot);
  return slot;
}

export function getRankedSlot(slotId: string) {
  const slot = requireSlot(slotId);
  const ranked = rankCandidates(slot);
  const p = estimateSlotCallSuccess(slot);
  const recommendation = calculateWaveSize({
    p,
    usableTimeMin: slot.startsInMin,
    fillMode: slot.fillMode,
  });

  return {
    slotId,
    ranked,
    recommendation,
  };
}

export function dispatchNextWave(slotId: string, requestedWaveSize?: number) {
  const slot = requireSlot(slotId);
  if (!["OPEN", "PAUSED_NEW_WAVES"].includes(slot.status)) {
    return {
      ok: false,
      reason: `Cannot dispatch a wave while slot is ${slot.status}.`,
      slot,
    };
  }

  if (slot.status === "PAUSED_NEW_WAVES") {
    return {
      ok: false,
      reason: "New waves are paused. Calls already in progress may still complete.",
      slot,
    };
  }

  const ranked = rankCandidates(slot);
  const p = estimateSlotCallSuccess(slot);
  const recommendation = calculateWaveSize({
    p,
    usableTimeMin: slot.startsInMin,
    fillMode: slot.fillMode,
  });
  const waveSize = requestedWaveSize ?? recommendation.waveSize;
  const waveCandidates = ranked.filter(eligibleForNextWave).slice(0, waveSize);

  if (!waveCandidates.length) {
    slot.status = "ESCALATED";
    slot.needsAttention = true;
    slot.lastEvent = "No eligible candidates";
    slot.timeline.push({
      id: eventId(),
      at: "now",
      kind: "escalated",
      message: "Escalated: no eligible candidates for the next wave",
    });
    return { ok: false, reason: "No eligible candidates.", slot };
  }

  const waveNumber = (slot.activeWave?.number ?? 0) + 1;
  const waveId = `${slot.id}:wave:${waveNumber}`;
  slot.status = "OFFERING";
  slot.waveSize = waveCandidates.length;
  slot.attempts += waveCandidates.length;
  slot.lastEvent = `Wave ${waveNumber} dispatched`;
  slot.reasoning = recommendation.explanation;
  slot.activeWave = {
    id: waveId,
    number: waveNumber,
    size: waveCandidates.length,
    timeoutSec: 90,
    candidates: waveCandidates.map((candidate) => ({
      name: candidate.name,
      state: "ringing",
    })),
  };
  slot.candidates = slot.candidates.map((candidate) =>
    waveCandidates.some((waveCandidate) => waveCandidate.id === candidate.id)
      ? { ...candidate, contactStatus: "ringing", lastContacted: "now" }
      : candidate,
  );
  slot.timeline.push({
    id: eventId(),
    at: "now",
    kind: "wave_dispatched",
    message: `Wave ${waveNumber} dispatched (size ${waveCandidates.length})`,
  });

  return { ok: true, slot, wave: slot.activeWave, recommendation };
}

export function recordCallOutcome(input: CallOutcomeInput) {
  const slot = requireSlot(input.slotId);
  const dedupeKey =
    input.providerEventId ??
    `${input.slotId}:${input.candidateId}:${input.waveId}:${input.outcome}`;

  if (processedEvents.has(dedupeKey)) {
    return { ok: true, duplicate: true, slot };
  }
  processedEvents.add(dedupeKey);

  const candidate = slot.candidates.find((c) => c.id === input.candidateId);
  if (!candidate) {
    return { ok: false, reason: "Candidate not found for slot.", slot };
  }

  candidate.contactStatus = input.outcome;
  candidate.lastContacted = candidate.lastContacted ?? "now";
  if (slot.activeWave) {
    slot.activeWave.candidates = slot.activeWave.candidates.map((waveCandidate) =>
      waveCandidate.name === candidate.name
        ? { ...waveCandidate, state: input.outcome }
        : waveCandidate,
    );
  }

  slot.timeline.push({
    id: eventId(),
    at: "now",
    kind: "call_outcome",
    message: `${candidate.name} — ${input.outcome.replace("_", " ")}`,
  });

  if (input.outcome === "accepted") {
    return {
      ok: true,
      booking: attemptBooking({
        slotId: input.slotId,
        candidateId: input.candidateId,
        waveId: input.waveId,
        source: "call_webhook",
      }),
      slot,
    };
  }

  const waveStillRinging = slot.activeWave?.candidates.some((c) => c.state === "ringing");
  if (slot.status === "OFFERING" && !waveStillRinging) {
    slot.status = "OPEN";
    slot.lastEvent = "Wave closed without booking";
  }

  return { ok: true, slot };
}

export function attemptBooking(input: AttemptBookingInput) {
  const slot = requireSlot(input.slotId);
  const candidate =
    input.candidateId != null ? slot.candidates.find((c) => c.id === input.candidateId) : undefined;
  const candidateName = input.candidateName ?? candidate?.name;

  if (!candidateName) {
    return { ok: false, code: "CANDIDATE_REQUIRED", message: "Candidate is required.", slot };
  }

  if (slot.status === "BOOKED") {
    const runnerUp =
      candidateName !== slot.bookedCustomer ? markRunnerUp(slot, candidateName) : null;
    return {
      ok: false,
      code: "BOOKING_CONFLICT",
      message: `Could not book. Slot already booked by ${slot.bookedCustomer}.`,
      runnerUp,
      slot,
    };
  }

  if (input.source === "call_webhook") {
    const activeWaveId = slot.activeWave?.id;
    if (slot.status !== "OFFERING" || (input.waveId && activeWaveId !== input.waveId)) {
      return {
        ok: false,
        code: "STALE_WAVE",
        message: "Acceptance came from a stale or inactive wave.",
        runnerUp: markRunnerUp(slot, candidateName),
        slot,
      };
    }
  }

  if (slot.status === "EXPIRED") {
    return {
      ok: false,
      code: "SLOT_EXPIRED",
      message: "Cannot book an expired slot.",
      slot,
    };
  }

  slot.status = "BOOKED";
  slot.bookedCustomer = candidateName;
  slot.recoveredMinBeforeStart = Math.max(slot.startsInMin, 0);
  slot.needsAttention = false;
  slot.lastEvent = `Booked ${candidateName}`;
  slot.candidates = slot.candidates.map((c) =>
    c.name === candidateName
      ? { ...c, contactStatus: "booked" }
      : c.contactStatus === "accepted"
        ? { ...c, contactStatus: "runner_up", runnerUpBoost: true }
        : c,
  );
  slot.timeline.push({
    id: eventId(),
    at: "now",
    kind: "booked",
    message: `${candidateName} booked the slot via ${input.source}`,
  });

  return {
    ok: true,
    code: "BOOKED",
    message: `Booked ${candidateName}.`,
    slot,
  };
}

export function setSlotPaused(slotId: string, paused: boolean) {
  const slot = requireSlot(slotId);
  if (slot.status === "BOOKED" || slot.status === "EXPIRED") {
    return { ok: false, reason: `Cannot pause a ${slot.status} slot.`, slot };
  }

  slot.status = paused ? "PAUSED_NEW_WAVES" : "OPEN";
  slot.lastEvent = paused ? "New waves paused" : "New waves resumed";
  slot.reasoning = paused
    ? "New waves are paused. Calls already ringing or in progress may still complete."
    : "Automation can dispatch the next wave when the slot is eligible.";
  slot.timeline.push({
    id: eventId(),
    at: "now",
    kind: "paused",
    message: slot.lastEvent,
  });

  return { ok: true, slot };
}

export function escalateSlot(slotId: string, reason = "Escalated to receptionist") {
  const slot = requireSlot(slotId);
  slot.status = "ESCALATED";
  slot.needsAttention = true;
  slot.lastEvent = reason;
  slot.timeline.push({
    id: eventId(),
    at: "now",
    kind: "escalated",
    message: reason,
  });
  return { ok: true, slot };
}

export function cancelAndReopen(slotId: string) {
  const slot = requireSlot(slotId);
  const previousCustomer = slot.bookedCustomer;
  slot.status = "OPEN";
  slot.bookedCustomer = undefined;
  slot.recoveredMinBeforeStart = undefined;
  slot.needsAttention = false;
  slot.lastEvent = "Booking cancelled, slot reopened";
  slot.timeline.push({
    id: eventId(),
    at: "now",
    kind: "slot_opened",
    message: `Booking cancelled${previousCustomer ? ` for ${previousCustomer}` : ""}. Slot reopened.`,
  });
  return { ok: true, slot };
}

function markRunnerUp(slot: Slot, candidateName: string) {
  slot.runnerUp = {
    winner: slot.bookedCustomer ?? "Unknown winner",
    runnerUps: [
      ...(slot.runnerUp?.runnerUps ?? []),
      {
        name: candidateName,
        messageStatus: "Runner-up message queued",
        priorityActive: true,
      },
    ],
    note: `${candidateName} accepted after ${slot.bookedCustomer}. Priority applies to the next eligible matching opening.`,
  };
  slot.candidates = slot.candidates.map((candidate) =>
    candidate.name === candidateName
      ? { ...candidate, contactStatus: "runner_up", runnerUpBoost: true }
      : candidate,
  );
  slot.timeline.push({
    id: eventId(),
    at: "now",
    kind: "runner_up",
    message: `${candidateName} became runner-up for next eligible matching slot`,
  });
  return slot.runnerUp;
}

function requireSlot(slotId: string) {
  const slot = getSlot(slotId);
  if (!slot) throw Object.assign(new Error(`Slot ${slotId} not found.`), { statusCode: 404 });
  return slot;
}

function eventId() {
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

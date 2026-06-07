/**
 * Call Orchestrator
 * Coordinates the workflow of dispatching waves and making calls
 */

import { makeOutboundCall } from "./fonio-client.server";
import {
  dispatchNextWave,
  getBackendState,
  getSlot,
  recordCallOutcome,
} from "./store.server";
import type { CallOutcome, Candidate, Slot } from "../types";

const LIVE_DEMO_WAVE_SIZE = 1;
const LIVE_DEMO_POLL_MS = 5_000;
const LIVE_DEMO_MAX_ADDITIONAL_CALLS = 8;
const LIVE_DEMO_MAX_RUNTIME_MS = 10 * 60 * 1_000;
const activeOfferingLoops = new Set<string>();

interface CallOrchestrationRequest {
  slotId: string;
  waveSize?: number;
}

interface CallOrchestrationResult {
  success: boolean;
  slotId: string;
  candidatesCalled: string[];
  callResults: CallResult[];
  message: string;
}

interface CallResult {
  candidateId: string;
  candidateName: string;
  phoneNumber: string;
  callStatus: "success" | "error";
  outcome?: "ringing" | "accepted" | "declined" | "no_answer" | "error";
  message: string;
}

/**
 * Orchestrate the complete call workflow for a slot
 */
export async function orchestrateCallWave(
  request: CallOrchestrationRequest,
): Promise<CallOrchestrationResult> {
  const { slotId } = request;
  const waveStartTime = Date.now();

  console.log(
    `[ORCHESTRATOR] 🚀 Starting call wave for slot ${slotId} at ${new Date().toISOString()}`,
  );

  try {
    // Step 1: Get the slot
    const slot = await getSlot(slotId);
    if (!slot) {
      console.error(`[ORCHESTRATOR] ❌ Slot ${slotId} not found`);
      return {
        success: false,
        slotId,
        candidatesCalled: [],
        callResults: [],
        message: "Slot not found",
      };
    }

    console.log(
      `[ORCHESTRATOR] ✓ Slot found: ${slot.provider} @ ${slot.timeLabel} (${slot.startsInMin}min from now)`,
    );

    const oneCall = await dispatchOneLiveCall(slotId);
    if (!oneCall.ok) {
      console.error(`[ORCHESTRATOR] ❌ Call dispatch failed: ${oneCall.message}`);
      return {
        success: false,
        slotId,
        candidatesCalled: [],
        callResults: [],
        message: oneCall.message,
      };
    }

    if (oneCall.callResult.outcome === "ringing") {
      startOfferingContinuation(slotId);
    }

    const waveDuration = Date.now() - waveStartTime;

    console.log(
      `[ORCHESTRATOR] ✅ One-call offering loop started in ${waveDuration}ms. Called: ${oneCall.candidate.id}, Outcome: ${oneCall.callResult.outcome}`,
    );

    return {
      success: true,
      slotId,
      candidatesCalled: [oneCall.candidate.id],
      callResults: [oneCall.callResult],
      message:
        oneCall.callResult.outcome === "ringing"
          ? "One call initiated. OpenSlot will keep trying one candidate at a time until someone books or candidates run out."
          : oneCall.callResult.message,
    };
  } catch (error) {
    console.error("[ORCHESTRATOR] ❌ Unexpected error in call wave:", error);
    return {
      success: false,
      slotId,
      candidatesCalled: [],
      callResults: [],
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function dispatchOneLiveCall(slotId: string): Promise<
  | {
      ok: true;
      candidate: Candidate;
      callResult: CallResult;
      message: string;
    }
  | {
      ok: false;
      message: string;
    }
> {
  console.log(
    `[ORCHESTRATOR] 📋 Dispatching one live demo call. Ranking still runs, but Fonio receives only one call at a time.`,
  );
  const dispatchResult = await dispatchNextWave(slotId, LIVE_DEMO_WAVE_SIZE);
  if (!dispatchResult.ok) {
    return {
      ok: false,
      message: `Wave dispatch failed: ${dispatchResult.reason}`,
    };
  }

  const candidate = dispatchResult.candidates?.[0];
  if (!candidate) {
    return {
      ok: false,
      message: "No eligible candidates available in waitlist for this slot",
    };
  }

  console.log(
    `[ORCHESTRATOR] ✓ Selected ${candidate.name} (id: ${candidate.id}, wait: ${candidate.waitDays} days)`,
  );

  const callStartTime = Date.now();
  const callResult = await callCandidate(candidate, dispatchResult.slot);
  const callDuration = Date.now() - callStartTime;

  const statusEmoji = callResult.callStatus === "success" ? "✓" : "❌";
  console.log(
    `[ORCHESTRATOR] ${statusEmoji} Call to ${candidate.name} ${callResult.callStatus} (${callDuration}ms) - Outcome: ${callResult.outcome}`,
  );

  const outcome: CallOutcome =
    callResult.outcome === "error" ? "no_answer" : (callResult.outcome ?? "no_answer");

  if (outcome === "ringing") {
    console.log(
      `[ORCHESTRATOR] ⏳ Fonio call is ringing. Waiting for after-call webhook before deciding yes/no.`,
    );
  } else {
    console.log(`[ORCHESTRATOR] 📝 Recording failed initiation outcome: ${outcome}`);
    await recordCallOutcome({
      slotId,
      candidateId: candidate.id,
      outcome,
      waveId: dispatchResult.wave?.id,
    });
  }

  return {
    ok: true,
    candidate,
    callResult,
    message: callResult.message,
  };
}

function startOfferingContinuation(slotId: string) {
  if (activeOfferingLoops.has(slotId)) {
    console.log(`[ORCHESTRATOR] 🔁 Offering continuation already active for slot ${slotId}`);
    return;
  }

  activeOfferingLoops.add(slotId);
  void continueOfferingUntilTerminal(slotId)
    .catch((error) => {
      console.error(`[ORCHESTRATOR] ❌ Offering continuation failed for ${slotId}:`, error);
    })
    .finally(() => {
      activeOfferingLoops.delete(slotId);
    });
}

async function continueOfferingUntilTerminal(slotId: string) {
  const startedAt = Date.now();
  let additionalCalls = 0;

  while (
    additionalCalls < LIVE_DEMO_MAX_ADDITIONAL_CALLS &&
    Date.now() - startedAt < LIVE_DEMO_MAX_RUNTIME_MS
  ) {
    await sleep(LIVE_DEMO_POLL_MS);

    const slot = await getSlot(slotId);
    if (!slot) {
      console.log(`[ORCHESTRATOR] 🛑 Slot ${slotId} disappeared; stopping offering loop.`);
      return;
    }

    if (["BOOKED", "ESCALATED", "EXPIRED"].includes(slot.status)) {
      console.log(
        `[ORCHESTRATOR] 🛑 Slot ${slotId} is ${slot.status}; stopping offering loop.`,
      );
      return;
    }

    if (slot.newWavesPaused || slot.status === "PAUSED_NEW_WAVES") {
      console.log(`[ORCHESTRATOR] ⏸ New waves are paused for slot ${slotId}.`);
      return;
    }

    if (slot.status === "OFFERING" || slot.activeWave?.candidates.length) {
      console.log(`[ORCHESTRATOR] ⏳ Slot ${slotId} still has a live call; polling again.`);
      continue;
    }

    if (slot.status !== "OPEN") {
      console.log(`[ORCHESTRATOR] ℹ️ Slot ${slotId} is ${slot.status}; polling again.`);
      continue;
    }

    const oneCall = await dispatchOneLiveCall(slotId);
    if (!oneCall.ok) {
      console.log(`[ORCHESTRATOR] 🛑 ${oneCall.message}`);
      return;
    }

    additionalCalls += 1;
    if (oneCall.callResult.outcome !== "ringing") {
      console.log(`[ORCHESTRATOR] ℹ️ Call did not reach ringing; checking next candidate soon.`);
    }
  }

  console.log(`[ORCHESTRATOR] 🛑 Offering continuation reached the demo safety limit.`);
}

/**
 * Make a call to a single candidate
 */
async function callCandidate(candidate: Candidate, slot: Slot): Promise<CallResult> {
  console.log(`[CANDIDATE] 🔍 Looking up phone number for ${candidate.name} (candidate id: ${candidate.id})`);

  // Get phone number from backend state by searching by name
  const state = await getBackendState();

  // Find the patient by name (more reliable than using candidate.id)
  const patient = state.slots
    .flatMap((s) => [
      s.bookedCustomer ? { name: s.bookedCustomer, phone: "" } : null,
      ...s.candidates.map((c) => ({ name: c.name, phone: "" })),
    ])
    .filter((p) => p && p.name === candidate.name)
    .at(0);

  if (!patient || !patient.name) {
    console.error(`[CANDIDATE] ❌ ${candidate.name} not found in backend state`);
    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      phoneNumber: "unknown",
      callStatus: "error",
      outcome: "no_answer",
      message: "Candidate not found in backend database",
    };
  }

  // Find the waitlist entry by matching the candidate name and service
  const waitlistEntry = state.waitlist.find(
    (w) => w.name === candidate.name && w.serviceTypes?.includes(slot.service),
  );

  if (!waitlistEntry) {
    console.error(
      `[CANDIDATE] ❌ ${candidate.name} not found in waitlist for service ${slot.service}`,
    );
    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      phoneNumber: "unknown",
      callStatus: "error",
      outcome: "no_answer",
      message: `Candidate not in waitlist for ${slot.service}`,
    };
  }

  const phoneNumber = waitlistEntry.phone;

  if (!phoneNumber) {
    console.error(`[CANDIDATE] ❌ ${candidate.name} has no phone number on file`);
    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      phoneNumber: "unknown",
      callStatus: "error",
      outcome: "no_answer",
      message: "No phone number available for candidate",
    };
  }

  console.log(
    `[CANDIDATE] ✓ Phone found: ${phoneNumber} for ${candidate.name} - initiating Fonio call...`,
  );

  try {
    // Make the actual call via Fonio
    const fonioResult = await makeOutboundCall(phoneNumber, candidate.name, {
      slotId: slot.id,
      timeLabel: slot.timeLabel,
      provider: slot.provider,
      service: slot.service,
    });

    if (fonioResult.status !== "success") {
      console.error(
        `[CANDIDATE] ❌ Fonio call failed for ${candidate.name}: ${fonioResult.message}`,
      );
      return {
        candidateId: candidate.id,
        candidateName: candidate.name,
        phoneNumber,
        callStatus: "error",
        outcome: "no_answer",
        message: `Fonio error: ${fonioResult.message}`,
      };
    }

    console.log(
      `[CANDIDATE] ✓ Call initiated successfully to ${candidate.name} (call ID: ${fonioResult.callId ?? "N/A"})`,
    );

    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      phoneNumber,
      callStatus: "success",
      outcome: "ringing",
      message: `Fonio call initiated for ${candidate.name}; awaiting after-call webhook.`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[CANDIDATE] ❌ Exception while calling ${candidate.name}: ${errorMsg}`,
      error,
    );
    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      phoneNumber,
      callStatus: "error",
      outcome: "no_answer",
      message: `Call exception: ${errorMsg}`,
    };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

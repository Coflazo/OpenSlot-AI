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
  outcome?: "accepted" | "declined" | "no_answer" | "error";
  message: string;
}

/**
 * Orchestrate the complete call workflow for a slot
 */
export async function orchestrateCallWave(
  request: CallOrchestrationRequest,
): Promise<CallOrchestrationResult> {
  const { slotId, waveSize } = request;
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

    // Step 2: Dispatch the wave to get candidates
    console.log(`[ORCHESTRATOR] 📋 Dispatching wave to select candidates...`);
    const dispatchResult = await dispatchNextWave(slotId, waveSize);
    if (!dispatchResult.ok) {
      console.error(`[ORCHESTRATOR] ❌ Wave dispatch failed: ${dispatchResult.reason}`);
      return {
        success: false,
        slotId,
        candidatesCalled: [],
        callResults: [],
        message: `Wave dispatch failed: ${dispatchResult.reason}`,
      };
    }

    if (!dispatchResult.candidates || dispatchResult.candidates.length === 0) {
      console.warn(`[ORCHESTRATOR] ⚠️  No candidates available to call for slot ${slotId}`);
      return {
        success: false,
        slotId,
        candidatesCalled: [],
        callResults: [],
        message: "No eligible candidates available in waitlist for this slot",
      };
    }

    console.log(
      `[ORCHESTRATOR] ✓ Wave dispatched with ${dispatchResult.candidates.length} candidates selected`,
    );
    dispatchResult.candidates.forEach((c, i) => {
      console.log(`  [${i + 1}] ${c.name} (id: ${c.id}, wait: ${c.waitDays} days)`);
    });

    // Step 3: Make calls to candidates
    const callResults: CallResult[] = [];
    const candidatesCalled: string[] = [];

    for (let i = 0; i < dispatchResult.candidates.length; i++) {
      const candidate = dispatchResult.candidates[i];
      const candidateIndex = i + 1;

      console.log(
        `[ORCHESTRATOR] 📞 [${candidateIndex}/${dispatchResult.candidates.length}] Calling ${candidate.name}...`,
      );

      const callStartTime = Date.now();
      const callResult = await callCandidate(candidate, slot);
      const callDuration = Date.now() - callStartTime;

      callResults.push(callResult);
      candidatesCalled.push(candidate.id);

      const statusEmoji =
        callResult.callStatus === "success" ? "✓" : "❌";
      console.log(
        `[ORCHESTRATOR] ${statusEmoji} Call to ${candidate.name} ${callResult.callStatus} (${callDuration}ms) - Outcome: ${callResult.outcome}`,
      );

      // Record the call outcome
      const outcome: CallOutcome =
        callResult.outcome === "error" ? "no_answer" : (callResult.outcome ?? "no_answer");
      console.log(`[ORCHESTRATOR] 📝 Recording outcome: ${outcome}`);

      await recordCallOutcome({
        slotId,
        candidateId: candidate.id,
        outcome,
        waveId: dispatchResult.wave?.id,
      });

      // If accepted, stop calling others
      if (outcome === "accepted") {
        console.log(
          `[ORCHESTRATOR] 🎉 Candidate ${candidate.name} ACCEPTED! Closing wave.`,
        );
        break;
      }

      if (outcome === "declined") {
        console.log(
          `[ORCHESTRATOR] 👋 Candidate ${candidate.name} declined. Trying next...`,
        );
        continue;
      }

      if (outcome === "no_answer") {
        console.log(
          `[ORCHESTRATOR] 📴 Candidate ${candidate.name} did not answer. Trying next...`,
        );
        continue;
      }
    }

    const waveDuration = Date.now() - waveStartTime;
    const successCount = callResults.filter((r) => r.callStatus === "success").length;
    const acceptedCount = callResults.filter((r) => r.outcome === "accepted").length;

    console.log(
      `[ORCHESTRATOR] ✅ Wave completed in ${waveDuration}ms. Called: ${candidatesCalled.length}, Success: ${successCount}, Accepted: ${acceptedCount}`,
    );

    return {
      success: true,
      slotId,
      candidatesCalled,
      callResults,
      message: `Wave completed: called ${candidatesCalled.length} candidates, ${acceptedCount} accepted (${waveDuration}ms)`,
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

    // Wait for the call to ring and be processed by Fonio (10 seconds)
    console.log(
      `[CANDIDATE] ⏳ Waiting 10 seconds for call to ring and be processed by Fonio...`,
    );
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // For Phase 1: Decision is random (will be replaced with transcription analysis)
    const randomDecision = Math.random();
    const accepted = randomDecision > 0.5;

    console.log(
      `[CANDIDATE] 🎲 Decision: ${accepted ? "ACCEPT (random > 0.5)" : "DECLINE (random ≤ 0.5)"} (random value: ${randomDecision.toFixed(3)})`,
    );

    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      phoneNumber,
      callStatus: "success",
      outcome: accepted ? "accepted" : "declined",
      message: accepted
        ? `${candidate.name} accepted the offer for ${slot.timeLabel} with ${slot.provider}`
        : `${candidate.name} declined the offer`,
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

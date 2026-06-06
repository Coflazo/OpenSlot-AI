/**
 * Call Orchestrator
 * Coordinates the workflow of dispatching waves and making calls
 */

import { makeOutboundCall } from "./fonio-client.server";
import {
  dispatchNextWave,
  getSlot,
  recordCallOutcome,
  getBackendState,
} from "./store.server";
import type { Candidate } from "../types";

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
  request: CallOrchestrationRequest
): Promise<CallOrchestrationResult> {
  const { slotId, waveSize } = request;

  console.log(`[ORCHESTRATOR] Starting call wave for slot ${slotId}`);

  try {
    // Step 1: Get the slot
    const slot = getSlot(slotId);
    if (!slot) {
      return {
        success: false,
        slotId,
        candidatesCalled: [],
        callResults: [],
        message: "Slot not found",
      };
    }

    // Step 2: Dispatch the wave to get candidates
    const dispatchResult = dispatchNextWave(slotId, waveSize);
    console.log(
      `[ORCHESTRATOR] Wave dispatched with ${dispatchResult.candidates.length} candidates`
    );

    // Step 3: Make calls to candidates
    const callResults: CallResult[] = [];
    const candidatesCalled: string[] = [];

    for (const candidate of dispatchResult.candidates) {
      const callResult = await callCandidate(candidate, slot);
      callResults.push(callResult);
      candidatesCalled.push(candidate.id);

      // Record the call outcome
      const outcome = callResult.outcome || "no_answer";
      recordCallOutcome({
        slotId,
        candidateId: candidate.id,
        outcome: outcome as any,
        waveId: dispatchResult.wave?.id,
      });

      // If accepted, stop calling others
      if (outcome === "accepted") {
        console.log(`[ORCHESTRATOR] Candidate ${candidate.name} accepted. Stopping wave.`);
        break;
      }
    }

    return {
      success: true,
      slotId,
      candidatesCalled,
      callResults,
      message: `Call wave completed. Called ${candidatesCalled.length} candidates.`,
    };
  } catch (error) {
    console.error("[ORCHESTRATOR] Error in call wave:", error);
    return {
      success: false,
      slotId,
      candidatesCalled: [],
      callResults: [],
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Make a call to a single candidate
 */
async function callCandidate(
  candidate: Candidate,
  slot: any
): Promise<CallResult> {
  // Get phone number from waitlist
  const waitlist = getBackendState().waitlist;
  const waitlistEntry = waitlist.find((w) => w.id === candidate.id);

  if (!waitlistEntry) {
    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      phoneNumber: "unknown",
      callStatus: "error",
      message: "Candidate not found in waitlist",
    };
  }

  const phoneNumber = waitlistEntry.phone;

  if (!phoneNumber) {
    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      phoneNumber: "unknown",
      callStatus: "error",
      message: "No phone number found for candidate",
    };
  }

  console.log(`[ORCHESTRATOR] Calling candidate ${candidate.name} at ${phoneNumber}`);

  try {
    // Make the actual call via Fonio
    const fonioResult = await makeOutboundCall(phoneNumber, candidate.name, {
      slotId: slot.id,
      timeLabel: slot.timeLabel,
      provider: slot.provider,
      service: slot.service,
    });

    if (fonioResult.status !== "success") {
      return {
        candidateId: candidate.id,
        candidateName: candidate.name,
        phoneNumber,
        callStatus: "error",
        outcome: "no_answer",
        message: fonioResult.message,
      };
    }

    // For Phase 1: Decision is random (will be replaced with transcription analysis)
    const accepted = Math.random() > 0.5;

    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      phoneNumber,
      callStatus: "success",
      outcome: accepted ? "accepted" : "declined",
      message: accepted
        ? "Candidate accepted to cover slot"
        : "Candidate declined",
    };
  } catch (error) {
    console.error(`[ORCHESTRATOR] Error calling ${candidate.name}:`, error);
    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      phoneNumber,
      callStatus: "error",
      outcome: "no_answer",
      message: error instanceof Error ? error.message : "Call failed",
    };
  }
}


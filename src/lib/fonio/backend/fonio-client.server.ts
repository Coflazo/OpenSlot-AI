/**
 * Fonio API Client
 * Handles outbound calls to candidates via Fonio.ai
 */

interface FonioCallRequest {
  apiKey: string;
  fromNumber: string;
  toNumber: string;
  agentId: string;
  context: Record<string, string | number>;
}

interface FonioCallResponse {
  status: string;
  message: string;
  callId?: string;
  error?: string;
  statusCode?: number;
}

const FONIO_ENDPOINT = "https://app.fonio.ai/api/public/v1/outbound_call";

export async function makeOutboundCall(
  toNumber: string,
  candidateName: string,
  slotDetails: {
    slotId: string;
    timeLabel: string;
    provider: string;
    service: string;
  },
): Promise<FonioCallResponse> {
  const apiKey = process.env.FONIO_API_KEY;
  const fromNumber = process.env.FONIO_FROM_NUMBER;
  const agentId = process.env.FONIO_AGENT_ID;

  if (!apiKey || !fromNumber || !agentId) {
    throw new Error("Fonio credentials not configured in environment variables");
  }

  const payload: FonioCallRequest = {
    apiKey,
    fromNumber,
    toNumber,
    agentId,
    context: {
      person_name: candidateName,
      slot_id: slotDetails.slotId,
      slot_time: slotDetails.timeLabel,
      provider: slotDetails.provider,
      service: slotDetails.service,
    },
  };

  console.log(`[FONIO] Initiating call to ${toNumber} for candidate ${candidateName}`);

  try {
    const response = await fetch(FONIO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as FonioCallResponse;

    if (!response.ok) {
      console.error(`[FONIO] Call failed: ${data.message || data.error}`);
      return {
        status: "error",
        message: data.message || data.error || "Call initiation failed",
        statusCode: response.status,
      };
    }

    console.log(`[FONIO] Call initiated successfully to ${toNumber}`);
    return {
      status: "success",
      message: data.message || "Call initiated",
      callId: data.callId,
    };
  } catch (error) {
    console.error("[FONIO] Network error:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Parse call transcription to determine if candidate accepted or declined
 * This is a placeholder - will be improved with better NLP later
 */
export function parseCallTranscription(transcription: string): {
  accepted: boolean;
  confidence: number;
  reason: string;
} {
  const lowerTranscription = transcription.toLowerCase();

  // Keywords indicating acceptance
  const acceptanceKeywords = [
    "sí",
    "si",
    "yes",
    "acepto",
    "accept",
    "puedo",
    "I can",
    "claro",
    "sure",
    "okay",
    "ok",
    "vale",
  ];

  // Keywords indicating rejection
  const rejectionKeywords = [
    "no",
    "cannot",
    "can't",
    "cannot",
    "deny",
    "decline",
    "no puedo",
    "no pueda",
    "sorry",
    "lo siento",
    "busy",
    "ocupado",
  ];

  const hasAcceptance = acceptanceKeywords.some((keyword) => lowerTranscription.includes(keyword));
  const hasRejection = rejectionKeywords.some((keyword) => lowerTranscription.includes(keyword));

  if (hasAcceptance && !hasRejection) {
    return {
      accepted: true,
      confidence: 0.9,
      reason: "Candidate indicated acceptance",
    };
  }

  if (hasRejection && !hasAcceptance) {
    return {
      accepted: false,
      confidence: 0.9,
      reason: "Candidate indicated rejection",
    };
  }

  // No clear indication - default to no answer
  return {
    accepted: false,
    confidence: 0.3,
    reason: "Unable to determine from transcription",
  };
}

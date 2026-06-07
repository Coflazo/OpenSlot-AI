/**
 * Fonio API Client
 * Handles outbound calls to patients via Fonio.ai
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
  patientName: string,
  slotDetails: {
    slotId: string;
    timeLabel: string;
    service: string;
    webhookUrl?: string;
  }
): Promise<FonioCallResponse> {
  const apiKey = process.env.FONIO_API_KEY;
  const fromNumber = process.env.FONIO_FROM_NUMBER;
  const agentId = process.env.FONIO_AGENT_ID;
  const clinicName = process.env.FONIO_CLINIC_NAME ?? "OpenSlot Medical";

  if (!apiKey || !fromNumber || !agentId) {
    const missingVars = [
      !apiKey && "FONIO_API_KEY",
      !fromNumber && "FONIO_FROM_NUMBER",
      !agentId && "FONIO_AGENT_ID",
    ]
      .filter(Boolean)
      .join(", ");
    console.error(`[FONIO] Missing credentials: ${missingVars}`);
    return {
      status: "error",
      message: `Fonio credentials not configured: ${missingVars}`,
    };
  }

  const context: Record<string, string | number> = {
    name: patientName,
    person_name: patientName,
    patient_name: patientName,
    clinic_name: clinicName,
    business_name: clinicName,
    slot_id: slotDetails.slotId,
    slotId: slotDetails.slotId, // Also in camelCase
    slot_time: slotDetails.timeLabel,
    service: slotDetails.service,
    offer_type: "waitlist",
    webhook_slot_id: slotDetails.slotId, // Explicitly for webhook
    webhook_url: slotDetails.webhookUrl || "", // Webhook callback URL
  };

  const payload: FonioCallRequest = {
    apiKey,
    fromNumber,
    toNumber,
    agentId,
    context,
  };

  console.log(
    `[FONIO] Initiating call to ${toNumber} for ${patientName} (slot: ${slotDetails.timeLabel}, service: ${slotDetails.service})`
  );
  console.log("[FONIO] Context being sent:", context);
  console.log("[FONIO] Webhook URL:", slotDetails.webhookUrl);

  try {
    const startTime = Date.now();
    const response = await fetch(FONIO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const requestDuration = Date.now() - startTime;
    const data = (await response.json()) as FonioCallResponse;

    if (!response.ok) {
      console.error(
        `[FONIO] Call failed (${response.status}): ${data.message || data.error}`
      );
      return {
        status: "error",
        message: data.message || data.error || `HTTP ${response.status}`,
        statusCode: response.status,
      };
    }

    console.log(
      `[FONIO] Call initiated successfully (${requestDuration}ms) - Full response:`,
      data
    );

    // Fonio may return callId in different fields
    const callId = data.callId || (data as any).call_id || (data as any).id || "fonio_call_" + Date.now();

    console.log(`[FONIO] Extracted callId: ${callId}`);

    return {
      status: "success",
      message: data.message || "Call initiated",
      callId,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[FONIO] Network error: ${errorMsg}`);
    return {
      status: "error",
      message: `Network error: ${errorMsg}`,
    };
  }
}

import type { CallEvent, FonioAdapter, StartCallRequest } from "./types";

type Listener = (event: CallEvent) => void;
const listeners = new Set<Listener>();

function appUrl(req?: StartCallRequest) {
  const fromRequest = req?.metadata?.webhook_base_url;
  if (typeof fromRequest === "string" && fromRequest.startsWith("http")) {
    return fromRequest.replace(/\/$/, "");
  }
  const explicit = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
}

function baseUrl() {
  return (process.env.FONIO_BASE_URL ?? "https://app.fonio.ai/api").replace(/\/$/, "");
}

function e164(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export const realFonioAdapter: FonioAdapter = {
  async startCall(req: StartCallRequest) {
    const apiKey = process.env.FONIO_API_KEY;
    const fromNumber = process.env.FONIO_FROM_NUMBER ?? process.env.FONIO_OUTBOUND_NUMBER_ID;
    const agentId = process.env.FONIO_AGENT_ID ?? process.env.FONIO_ASSISTANT_ID;
    const token = process.env.FONIO_WEBHOOK_TOKEN;
    const clinicName = process.env.FONIO_CLINIC_NAME ?? "OpenSlot Medical";
    if (!apiKey || !fromNumber) {
      throw new Error("Fonio is not configured: set FONIO_API_KEY + FONIO_FROM_NUMBER or FONIO_OUTBOUND_NUMBER_ID");
    }

    const businessName = (req.metadata?.business_name as string) ?? clinicName;
    const serviceName = (req.metadata?.service_name as string) ?? "";
    const slotTime = (req.metadata?.slot_time as string) ?? "";
    const midCallUrl = token
      ? `${appUrl(req)}/api/fonio/mid-call?token=${token}`
      : `${appUrl(req)}/api/fonio/mid-call`;
    const postCallUrl = token
      ? `${appUrl(req)}/api/fonio/post-call?token=${token}`
      : `${appUrl(req)}/api/fonio/post-call`;

    const body: Record<string, unknown> = {
      apiKey,
      fromNumber: e164(fromNumber),
      toNumber: e164(req.customerPhone),
      context: {
        // canonical Coflaz fields
        business_name: businessName,
        customer_name: req.customerName,
        customer_email: req.metadata?.customer_email ?? "",
        customer_language: req.metadata?.customer_language ?? "en",
        service_name: serviceName,
        slot_time: slotTime,
        current_slot_time: req.metadata?.current_slot_time ?? "",
        new_slot_time: req.metadata?.new_slot_time ?? "",
        arrival_time: req.metadata?.arrival_time ?? "",
        location: req.metadata?.location ?? "",
        offer_intro_line: req.metadata?.offer_intro_line ?? req.script,
        offer_id: req.callId,
        // final-branch aliases so the Fonio agent prompt finds the variable
        // under whichever name it was authored against
        name: req.customerName,
        person_name: req.customerName,
        patient_name: req.customerName,
        clinic_name: clinicName,
        slot_id: req.slotId,
        slotId: req.slotId,
        service: serviceName,
        offer_type: "waitlist",
        webhook_slot_id: req.slotId,
        webhook_url: postCallUrl,
        // webhooks
        mid_call_url: midCallUrl,
        post_call_url: postCallUrl
      }
    };
    if (agentId) body.agentId = agentId;

    const resp = await fetch(`${baseUrl()}/public/v1/outbound_call`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Fonio startCall ${resp.status}: ${text}`);
    }

    const data = (await resp.json()) as { status?: string; message?: string; id?: string; callId?: string };
    if (data.status === "error") {
      throw new Error(`Fonio outbound_call error: ${data.message ?? "unknown error"}`);
    }
    return { callId: data.id ?? data.callId ?? req.callId };
  },

  async cancelCall(callId: string) {
    const apiKey = process.env.FONIO_API_KEY;
    if (!apiKey) return;
    await fetch(`${baseUrl()}/calls/${callId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` }
    });
  },

  onCallEvent(handler) {
    listeners.add(handler);
    return () => listeners.delete(handler) as unknown as void;
  }
};

// Webhook receivers call this to fan events out to subscribed UI clients.
export function emitFonioEvent(event: CallEvent) {
  listeners.forEach((l) => l(event));
}

import { NextRequest, NextResponse } from "next/server";
import { getFonio, isMockActive } from "@/lib/fonio/adapter";
import { recordDemoCall, updateDemoCall } from "@/lib/fonio/demoCallStore";
import { customers as mockCustomers } from "@/lib/mock/customers";
import { TWO_PERSON_CUSTOMERS } from "@/lib/mock/twoPersonDemo";
import type { CallType } from "@/lib/types";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

// POST /api/fonio/demo-call
// Body accepts customer/phone overrides plus slot script context used by the Fonio prompt.
// Defaults to Çağan (cust_cagan, +31 6 309 247 15) so the user can call themselves.

function requestOrigin(req: NextRequest) {
  return (req.headers.get("origin") ?? req.nextUrl.origin).replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const customerId = (body?.customerId as string | undefined) ?? "cust_cagan";
  const customer =
    TWO_PERSON_CUSTOMERS.find((c) => c.id === customerId) ??
    mockCustomers.find((c) => c.id === customerId) ??
    mockCustomers[0];
  const toNumber = (body?.toNumber as string | undefined) ?? customer.phone;
  const language = (body?.language as string | undefined) ?? customer.language;
  const callType = (body?.type as CallType | undefined) ?? "waitlist_offer";
  const slotId = (body?.slotId as string | undefined) ?? "slot_today_1630";
  const serviceName = (body?.serviceName as string | undefined) ?? customer.requestedService ?? "MRI Knee";
  const slotTime = (body?.slotTime as string | undefined) ?? "today at 16:30";
  const location = (body?.location as string | undefined) ?? "Innere Stadt";
  const arrivalTime = (body?.arrivalTime as string | undefined) ?? "16:15";
  const currentSlotTime = (body?.currentSlotTime as string | undefined) ?? "";
  const newSlotTime = (body?.newSlotTime as string | undefined) ?? slotTime;
  const offerIntroLine =
    (body?.offerIntroLine as string | undefined) ??
    `A ${serviceName} slot just opened ${slotTime}.`;

  if (isMockActive()) {
    return NextResponse.json({
      ok: false,
      reason: "fonio_not_configured",
      hint: "Set FONIO_API_KEY + FONIO_ASSISTANT_ID + FONIO_OUTBOUND_NUMBER_ID + USE_MOCK_FONIO=false in .env."
    });
  }

  const offerId = `demo_${nanoid(10)}`;
  const startedAt = new Date().toISOString();

  recordDemoCall({
    offerId,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: toNumber,
    startedAt,
    status: "queued"
  });

  const adapter = getFonio();
  try {
    const res = await adapter.startCall({
      callId: offerId,
      slotId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: toNumber,
      type: callType,
      script: "",
      metadata: {
        business_name: "Vienna Private Imaging",
        customer_language: language,
        customer_email: customer.email,
        service_name: serviceName,
        slot_time: slotTime,
        location,
        offer_intro_line: offerIntroLine,
        arrival_time: arrivalTime,
        current_slot_time: currentSlotTime,
        new_slot_time: newSlotTime,
        offer_id: offerId,
        webhook_base_url: requestOrigin(req)
      }
    });
    updateDemoCall(offerId, { providerCallId: res.callId });
    return NextResponse.json({ ok: true, offerId, providerCallId: res.callId });
  } catch (err) {
    const msg = String(err);
    recordDemoCall({
      offerId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: toNumber,
      startedAt,
      status: "failed",
      error: msg
    });
    return NextResponse.json({ ok: false, offerId, error: msg }, { status: 500 });
  }
}

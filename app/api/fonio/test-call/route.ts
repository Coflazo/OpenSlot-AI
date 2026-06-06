import { NextRequest, NextResponse } from "next/server";
import { getFonio, isMockActive } from "@/lib/fonio/adapter";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const toNumber = body?.toNumber as string | undefined;
  if (!toNumber) {
    return NextResponse.json({ error: "missing_to_number" }, { status: 400 });
  }
  if (isMockActive()) {
    return NextResponse.json({
      ok: false,
      reason: "fonio_not_configured",
      hint: "Set FONIO_API_KEY + FONIO_ASSISTANT_ID + FONIO_OUTBOUND_NUMBER_ID in .env.local"
    });
  }

  const adapter = getFonio();
  const callId = `test_${nanoid(10)}`;
  try {
    const res = await adapter.startCall({
      callId,
      slotId: "test",
      customerId: "test",
      customerName: body?.customerName ?? "Test Caller",
      customerPhone: toNumber,
      type: "waitlist_offer",
      script:
        body?.scriptOverride ??
        "This is a test call from OpenSlot AI. If you can hear me, the wiring works. Goodbye.",
      metadata: {
        business_name: body?.businessName ?? "Vienna Private Imaging",
        customer_language: body?.language ?? "en",
        service_name: "Test",
        slot_time: "now",
        location: "Test",
        offer_intro_line: "This is a test call from OpenSlot AI.",
        arrival_time: ""
      }
    });
    return NextResponse.json({ ok: true, callId: res.callId });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

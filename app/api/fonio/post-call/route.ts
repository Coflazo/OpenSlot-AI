import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { safeParseExtraction } from "@/lib/fonio/variableExtraction";

export const runtime = "nodejs";

function tokenValid(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.FONIO_WEBHOOK_TOKEN;
  return !!token && !!expected && token === expected;
}

export async function POST(req: NextRequest) {
  if (!tokenValid(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const offerId = body?.offer_id as string | undefined;
  if (!offerId) {
    return NextResponse.json({ ok: false, reason: "missing_offer_id" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const extraction = safeParseExtraction(body?.extraction ?? body?.variables);

  const status: string = extraction.slotAccepted
    ? "accepted"
    : extraction.voicemail
      ? "voicemail"
      : body?.status ?? "declined";

  // Persist the call outcome.
  const { data: callAttempt } = await supabase
    .from("call_attempts")
    .update({
      provider_call_id: body?.call_id ?? null,
      status,
      ended_at: new Date().toISOString(),
      duration_seconds: body?.duration_seconds ?? null,
      transcript: body?.transcript ?? null,
      extraction,
      recording_url: body?.recording_url ?? null,
      needs_review: extraction.askedMedicalQuestion || extraction.wantsCallback || body?.needs_review === true,
      review_reason: extraction.askedMedicalQuestion
        ? "Customer asked a medical question"
        : extraction.wantsCallback
          ? "Customer asked for a human"
          : null
    })
    .eq("offer_id", offerId)
    .select("*")
    .single();

  // Persist opt-out if signalled.
  if (extraction.optOut && callAttempt?.customer_id) {
    await supabase
      .from("customer_consents")
      .update({ withdrawn_at: new Date().toISOString() })
      .eq("customer_id", callAttempt.customer_id);
  }

  // If accepted, atomically lock the slot.
  let booking: unknown = null;
  if (extraction.slotAccepted && callAttempt?.slot_id && callAttempt?.customer_id) {
    const { data } = await supabase.rpc("claim_open_slot", {
      p_slot_id: callAttempt.slot_id,
      p_customer_id: callAttempt.customer_id,
      p_offer_id: offerId
    });
    booking = data;
  }

  return NextResponse.json({ ok: true, booking });
}

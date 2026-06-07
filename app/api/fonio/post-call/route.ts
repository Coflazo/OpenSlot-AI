import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { safeParseExtraction } from "@/lib/fonio/variableExtraction";
import { recordDemoCall, updateDemoCall } from "@/lib/fonio/demoCallStore";
import type { DemoCall } from "@/lib/fonio/demoCallStore";

export const runtime = "nodejs";

function tokenValid(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.FONIO_WEBHOOK_TOKEN;
  return !!token && !!expected && token === expected;
}

function extractionInput(body: Record<string, any>) {
  const raw = body?.extraction ?? body?.extractionData ?? body?.variables ?? body;
  const outcome = String(raw?.call_outcome ?? raw?.outcome ?? body?.status ?? "").toLowerCase();
  return {
    ...raw,
    slotAccepted: raw?.slotAccepted ?? outcome === "accepted",
    voicemail: raw?.voicemail ?? outcome === "voicemail",
    wantsCallback: raw?.wantsCallback ?? raw?.needsCallback ?? false
  };
}

export async function POST(req: NextRequest) {
  if (!tokenValid(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({})) as Record<string, any>;
  const offerId = (
    body?.offer_id ??
    body?.offerId ??
    body?.context?.offer_id ??
    body?.context?.offerId ??
    body?.variables?.offer_id ??
    body?.variables?.offerId ??
    body?.extraction?.offer_id ??
    body?.extraction?.offerId
  ) as string | undefined;
  if (!offerId) {
    return NextResponse.json({ ok: false, reason: "missing_offer_id" }, { status: 400 });
  }

  const extraction = safeParseExtraction(extractionInput(body));

  const status: string = extraction.slotAccepted
    ? "accepted"
    : extraction.voicemail
      ? "voicemail"
      : body?.extractionData?.call_outcome ?? body?.status ?? "declined";

  // Update the demo-call in-memory store so the simulation UI can poll it.
  if (offerId.startsWith("demo_")) {
    const patch: Partial<DemoCall> = {
      status: status as DemoCall["status"],
      durationSeconds: body?.duration_seconds ?? body?.duration ?? undefined,
      transcript: body?.transcript ?? body?.formattedPlainTranscript ?? body?.formattedTranscript ?? undefined,
      extraction,
      recordingUrl: body?.recording_url ?? body?.audioLink ?? undefined,
      providerCallId: body?.call_id ?? body?.id ?? undefined,
      endedAt: new Date().toISOString()
    };
    const updated = updateDemoCall(offerId, patch);
    if (!updated) {
      recordDemoCall({
        offerId,
        customerId: body?.context?.customer_id ?? "demo_customer",
        customerName: body?.context?.customer_name ?? "Demo customer",
        customerPhone: body?.toNumber ?? "",
        startedAt: body?.startTimestamp ?? new Date().toISOString(),
        status: patch.status ?? "accepted",
        ...patch
      });
    }
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = createSupabaseServiceClient();

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

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { updateDemoCall } from "@/lib/fonio/demoCallStore";

export const runtime = "nodejs";

// Mid-call webhook: Fonio asks "is the slot still open?" before the agent confirms.
// We answer { proceed: true } if status is still open/calling/held, else apologise + end.

function tokenValid(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.FONIO_WEBHOOK_TOKEN;
  return !!token && !!expected && token === expected;
}

export async function POST(req: NextRequest) {
  if (!tokenValid(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const offerId = (
    body?.offer_id ??
    body?.offerId ??
    body?.context?.offer_id ??
    body?.context?.offerId ??
    body?.variables?.offer_id ??
    body?.variables?.offerId
  ) as string | undefined;
  if (!offerId) {
    return NextResponse.json({ proceed: false, instruction: "Missing offer_id. End the call politely." });
  }

  // Demo calls live in-memory; just say proceed.
  if (offerId.startsWith("demo_")) {
    updateDemoCall(offerId, { status: "in_progress" });
    return NextResponse.json({ proceed: true });
  }

  const supabase = createSupabaseServiceClient();
  const { data: callAttempt } = await supabase
    .from("call_attempts")
    .select("slot_id")
    .eq("offer_id", offerId)
    .single();

  if (!callAttempt?.slot_id) {
    return NextResponse.json({ proceed: false, instruction: "Apologise: the slot offer is no longer valid." });
  }

  const { data: slot } = await supabase
    .from("slots")
    .select("status")
    .eq("id", callAttempt.slot_id)
    .single();

  const open = slot && ["open", "calling", "held"].includes(slot.status);
  if (!open) {
    return NextResponse.json({
      proceed: false,
      instruction: "Apologise and end the call: the slot was just taken."
    });
  }
  return NextResponse.json({ proceed: true });
}

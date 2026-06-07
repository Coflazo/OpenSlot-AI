import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// POST /api/slots/book
// Body: { slotId, customerId }
// Direct manual booking. Idempotent: refuses to book a slot that is already
// booked/filled/cancelled. Use /api/booking/confirm for the offer-flow variant
// (which uses the claim_open_slot RPC and an offer_id).

export async function POST(req: Request) {
  const { slotId, customerId } = await req.json().catch(() => ({}));
  if (!slotId || !customerId) {
    return NextResponse.json({ ok: false, error: "slotId and customerId required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("id, status, clinic_id")
    .eq("id", slotId)
    .single();
  if (slotError || !slot) {
    return NextResponse.json({ ok: false, error: "slot not found" }, { status: 404 });
  }
  if (!["open", "calling", "held"].includes(slot.status)) {
    return NextResponse.json(
      { ok: false, error: `slot status is '${slot.status}', cannot book` },
      { status: 409 }
    );
  }

  const { error: updateError } = await supabase
    .from("slots")
    .update({ status: "booked", current_customer_id: customerId })
    .eq("id", slotId);
  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  await supabase.from("audit_log").insert({
    clinic_id: slot.clinic_id,
    actor_type: "user",
    action: "slot.booked.manual",
    object_type: "slot",
    object_id: slotId,
    result: "success",
    lawful_basis_tag: "contract",
    metadata: { customer_id: customerId }
  });

  return NextResponse.json({ ok: true, slotId, customerId, status: "booked" });
}

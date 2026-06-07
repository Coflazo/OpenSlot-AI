import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// POST /api/slots/call
// Body: { slotId, accepted: boolean, offeringId? }
// Records a patient's response to the call for a slot.
//   accepted=true  → slot becomes 'filled', this offering 'accepted',
//                    others 'rejected', waitlist entry 'converted'.
//   accepted=false → this offering 'rejected'. If more offerings remain the
//                    slot stays 'calling' for the next attempt; otherwise it
//                    falls back to 'open' so the receptionist can escalate.
//
// If offeringId is omitted, the oldest offering with status='offering' wins.

export async function POST(req: Request) {
  const { slotId, accepted, offeringId } = await req.json().catch(() => ({}));
  if (!slotId || typeof accepted !== "boolean") {
    return NextResponse.json({ ok: false, error: "slotId and accepted required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("id, clinic_id, status")
    .eq("id", slotId)
    .single();
  if (slotError || !slot) {
    return NextResponse.json({ ok: false, error: "slot not found" }, { status: 404 });
  }

  const offeringsQuery = supabase
    .from("slot_offerings")
    .select("id, waitlist_entry_id, status, waitlist_entries(id, customer_id, customers(id, full_name))")
    .eq("slot_id", slotId)
    .order("offered_at", { ascending: true });

  const { data: offerings, error: offeringsError } = await offeringsQuery;
  if (offeringsError) {
    return NextResponse.json({ ok: false, error: offeringsError.message }, { status: 500 });
  }

  const pending = (offerings ?? []).filter((o: any) => o.status === "offering");
  if (pending.length === 0) {
    return NextResponse.json({ ok: false, error: "no pending offerings for this slot" }, { status: 404 });
  }
  const current: any = offeringId
    ? pending.find((o: any) => o.id === offeringId)
    : pending[0];
  if (!current) {
    return NextResponse.json({ ok: false, error: "offering not found among pending" }, { status: 404 });
  }
  const customerId = current.waitlist_entries?.customer_id ?? current.waitlist_entries?.customers?.id ?? null;
  const customerName = current.waitlist_entries?.customers?.full_name ?? null;
  const respondedAt = new Date().toISOString();

  if (accepted) {
    await supabase
      .from("slots")
      .update({ status: "filled", current_customer_id: customerId })
      .eq("id", slotId);

    await supabase
      .from("slot_offerings")
      .update({ status: "accepted", responded_at: respondedAt })
      .eq("id", current.id);

    const losers = pending.filter((o: any) => o.id !== current.id).map((o: any) => o.id);
    if (losers.length > 0) {
      await supabase
        .from("slot_offerings")
        .update({ status: "rejected", responded_at: respondedAt })
        .in("id", losers);
    }

    if (current.waitlist_entry_id) {
      await supabase
        .from("waitlist_entries")
        .update({ status: "converted" })
        .eq("id", current.waitlist_entry_id);
    }

    await supabase.from("audit_log").insert({
      clinic_id: slot.clinic_id,
      actor_type: "system",
      action: "slot.filled.via_offering",
      object_type: "slot",
      object_id: slotId,
      result: "success",
      lawful_basis_tag: "contract",
      metadata: { offering_id: current.id, customer_id: customerId }
    });

    return NextResponse.json({
      ok: true,
      slotId,
      status: "filled",
      customerId,
      customerName
    });
  }

  // declined
  await supabase
    .from("slot_offerings")
    .update({ status: "rejected", responded_at: respondedAt })
    .eq("id", current.id);

  const remaining = pending.filter((o: any) => o.id !== current.id);
  let nextStatus = slot.status;
  if (remaining.length === 0) {
    nextStatus = "open";
    await supabase.from("slots").update({ status: "open" }).eq("id", slotId);
  }

  await supabase.from("audit_log").insert({
    clinic_id: slot.clinic_id,
    actor_type: "system",
    action: "slot.offer.declined",
    object_type: "slot",
    object_id: slotId,
    result: "info",
    lawful_basis_tag: "contract",
    metadata: { offering_id: current.id, customer_id: customerId, remaining: remaining.length }
  });

  return NextResponse.json({
    ok: true,
    slotId,
    status: nextStatus,
    remaining: remaining.length,
    declinedCustomerId: customerId
  });
}

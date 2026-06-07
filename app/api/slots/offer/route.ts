import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// POST /api/slots/offer
// Body: { slotId }
// Finds every active waitlist entry for the slot's service and creates a
// slot_offerings row for each. Idempotent: the unique (slot_id,
// waitlist_entry_id) constraint plus on-conflict-ignore means duplicate clicks
// are safe. Slot status is flipped to 'calling' (matching schema enum).

export async function POST(req: Request) {
  const { slotId } = await req.json().catch(() => ({}));
  if (!slotId) {
    return NextResponse.json({ ok: false, error: "slotId required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("id, service_id, clinic_id, status")
    .eq("id", slotId)
    .single();
  if (slotError || !slot) {
    return NextResponse.json({ ok: false, error: "slot not found" }, { status: 404 });
  }
  if (!["open", "calling"].includes(slot.status)) {
    return NextResponse.json(
      { ok: false, error: `slot status is '${slot.status}', cannot offer` },
      { status: 409 }
    );
  }

  const { data: waitlistEntries, error: waitlistError } = await supabase
    .from("waitlist_entries")
    .select("id, customer_id, urgency_score, customers(id, full_name, phone, email)")
    .eq("clinic_id", slot.clinic_id)
    .eq("service_id", slot.service_id)
    .eq("status", "active")
    .order("urgency_score", { ascending: false });
  if (waitlistError) {
    return NextResponse.json({ ok: false, error: waitlistError.message }, { status: 500 });
  }

  if (!waitlistEntries || waitlistEntries.length === 0) {
    return NextResponse.json({ ok: true, count: 0, offerings: [], message: "no active waitlist entries for this service" });
  }

  const rows = waitlistEntries.map((entry: any) => ({
    slot_id: slotId,
    waitlist_entry_id: entry.id,
    status: "offering" as const
  }));

  // upsert with ignoreDuplicates so duplicate clicks don't error
  const { error: insertError } = await supabase
    .from("slot_offerings")
    .upsert(rows, { onConflict: "slot_id,waitlist_entry_id", ignoreDuplicates: true });
  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  if (slot.status !== "calling") {
    await supabase.from("slots").update({ status: "calling" }).eq("id", slotId);
  }

  await supabase.from("audit_log").insert({
    clinic_id: slot.clinic_id,
    actor_type: "user",
    action: "slot.offered",
    object_type: "slot",
    object_id: slotId,
    result: "success",
    lawful_basis_tag: "contract",
    metadata: { count: waitlistEntries.length }
  });

  const candidates = waitlistEntries.map((entry: any) => ({
    waitlist_entry_id: entry.id,
    customer_id: entry.customer_id,
    customer_name: entry.customers?.full_name ?? null,
    customer_phone: entry.customers?.phone ?? null,
    customer_email: entry.customers?.email ?? null
  }));

  return NextResponse.json({ ok: true, slotId, count: candidates.length, candidates });
}

import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getFonio } from "@/lib/fonio/adapter";

export const runtime = "nodejs";

// POST /api/slots/start-call
// Body: { slotId, offeringId? }
// Initiates an outbound Fonio call to the next pending offering on the slot.
// If offeringId is omitted, the oldest pending offering is dialed.
// Records a call_attempts row with the providerCallId so /api/fonio/post-call
// can join the dots on the webhook side.

export async function POST(req: Request) {
  const { slotId, offeringId } = await req.json().catch(() => ({}));
  if (!slotId) {
    return NextResponse.json({ ok: false, error: "slotId required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select(
      "id, clinic_id, status, start_time, services(name, duration_minutes), locations(name)"
    )
    .eq("id", slotId)
    .single();
  if (slotError || !slot) {
    return NextResponse.json({ ok: false, error: "slot not found" }, { status: 404 });
  }

  let offeringQuery = supabase
    .from("slot_offerings")
    .select(
      "id, waitlist_entry_id, status, waitlist_entries(id, customer_id, customers(id, full_name, phone, email, language))"
    )
    .eq("slot_id", slotId)
    .eq("status", "offering")
    .order("offered_at", { ascending: true })
    .limit(1);
  if (offeringId) {
    offeringQuery = supabase
      .from("slot_offerings")
      .select(
        "id, waitlist_entry_id, status, waitlist_entries(id, customer_id, customers(id, full_name, phone, email, language))"
      )
      .eq("id", offeringId)
      .limit(1);
  }
  const { data: offeringRows, error: offeringError } = await offeringQuery;
  if (offeringError) {
    return NextResponse.json({ ok: false, error: offeringError.message }, { status: 500 });
  }
  const offering: any = offeringRows?.[0];
  if (!offering) {
    return NextResponse.json(
      { ok: false, error: "no offering available for this slot" },
      { status: 404 }
    );
  }
  const customer: any = offering.waitlist_entries?.customers;
  if (!customer?.phone) {
    return NextResponse.json(
      { ok: false, error: "customer phone missing" },
      { status: 400 }
    );
  }

  const offerId = `${slotId}_${customer.id}_${nanoid(6)}`;
  const slotTimeLabel = slot.start_time
    ? new Date(slot.start_time).toLocaleString("de-AT")
    : "";
  const serviceName = (slot as any).services?.name ?? "";
  const locationName = (slot as any).locations?.name ?? "";

  const { error: insertError } = await supabase.from("call_attempts").insert({
    clinic_id: slot.clinic_id,
    slot_id: slotId,
    customer_id: customer.id,
    offer_id: offerId,
    call_type: "waitlist_offer",
    direction: "outbound",
    status: "queued"
  });
  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  const fonio = getFonio();
  try {
    const result = await fonio.startCall({
      callId: offerId,
      slotId,
      customerId: customer.id,
      customerName: customer.full_name,
      customerPhone: customer.phone,
      type: "waitlist_offer",
      script: `A ${serviceName} slot opened at ${slotTimeLabel}.`,
      metadata: {
        business_name: process.env.FONIO_CLINIC_NAME ?? "OpenSlot Medical",
        customer_email: customer.email ?? "",
        customer_language: customer.language ?? "en",
        service_name: serviceName,
        slot_time: slotTimeLabel,
        location: locationName,
        offer_id: offerId,
        offering_id: offering.id,
        offer_intro_line: `A ${serviceName} slot opened ${slotTimeLabel}.`
      }
    });

    await supabase
      .from("call_attempts")
      .update({ provider_call_id: result.callId, status: "ringing", started_at: new Date().toISOString() })
      .eq("offer_id", offerId);

    return NextResponse.json({
      ok: true,
      slotId,
      offeringId: offering.id,
      customerId: customer.id,
      customerName: customer.full_name,
      offerId,
      providerCallId: result.callId
    });
  } catch (err) {
    await supabase
      .from("call_attempts")
      .update({ status: "failed" })
      .eq("offer_id", offerId);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

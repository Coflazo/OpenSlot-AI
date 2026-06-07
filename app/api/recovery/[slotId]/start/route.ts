import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getFonio } from "@/lib/fonio/adapter";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

// Kicks off the recovery loop for a slot. In production this would:
// 1. Load the slot + services + rules + waitlist
// 2. Score candidates (route-aware) via the explainCandidate algorithm
// 3. Pick top N per aggression
// 4. Start outbound calls via the Fonio adapter
//
// For Phase 2 we wire the contract end to end and call Fonio once for the
// top candidate. Full multi-call concurrency lands in Phase 3.

export async function POST(req: NextRequest, context: { params: { slotId: string } }) {
  const supabase = createSupabaseServiceClient();
  const slotId = context.params.slotId;
  const body = await req.json().catch(() => ({}));
  const customerId = body?.customerId as string | undefined;

  const { data: slot } = await supabase
    .from("slots")
    .select("*, services(name, duration_minutes), locations(name)")
    .eq("id", slotId)
    .single();
  if (!slot) return NextResponse.json({ ok: false, error: "slot_not_found" }, { status: 404 });

  if (!customerId) {
    return NextResponse.json({ ok: false, error: "customer_required_phase2" }, { status: 400 });
  }
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();
  if (!customer) return NextResponse.json({ ok: false, error: "customer_not_found" }, { status: 404 });

  const offerId = `${slotId}_${customerId}_${nanoid(6)}`;

  const { error: insertErr } = await supabase.from("call_attempts").insert({
    clinic_id: slot.clinic_id,
    slot_id: slotId,
    customer_id: customerId,
    offer_id: offerId,
    call_type: "waitlist_offer",
    direction: "outbound",
    status: "queued"
  });
  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  const fonio = getFonio();
  try {
    const r = await fonio.startCall({
      callId: offerId,
      slotId,
      customerId,
      customerName: customer.full_name,
      customerPhone: customer.phone,
      type: "waitlist_offer",
      script: "",
      metadata: {
        business_name: "Vienna Private Imaging",
        customer_language: customer.language,
        service_name: slot.services?.name ?? "",
        slot_time: new Date(slot.start_time).toLocaleString("de-AT"),
        location: slot.locations?.name ?? "",
        offer_intro_line: `A ${slot.services?.name ?? "scan"} slot opened ${new Date(slot.start_time).toLocaleString("de-AT")}.`,
        arrival_time: new Date(new Date(slot.start_time).getTime() - 15 * 60_000).toLocaleString("de-AT")
      }
    });
    return NextResponse.json({ ok: true, offerId, providerCallId: r.callId });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

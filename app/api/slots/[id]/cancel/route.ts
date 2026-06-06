import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, context: { params: { id: string } }) {
  const supabase = createSupabaseServiceClient();
  const slotId = context.params.id;

  const { data: slot, error } = await supabase
    .from("slots")
    .update({ status: "open", origin: "patient_cancellation" })
    .eq("id", slotId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const { data: openEvent, error: evErr } = await supabase
    .from("open_slot_events")
    .insert({
      clinic_id: slot.clinic_id,
      slot_id: slot.id,
      status: "detected"
    })
    .select("*")
    .single();
  if (evErr) return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    clinic_id: slot.clinic_id,
    actor_type: "system",
    action: "slot.cancelled",
    object_type: "slot",
    object_id: slotId,
    result: "info",
    lawful_basis_tag: "contract",
    metadata: { open_event_id: openEvent.id }
  });

  return NextResponse.json({ ok: true, slot, openEvent });
}

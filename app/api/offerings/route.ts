import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// GET /api/offerings?slotId=<uuid>
// Lists every offering (and its candidate customer) for a slot.
// Used by the slot detail panel to show "who is being called next".

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slotId = url.searchParams.get("slotId");
  if (!slotId) {
    return NextResponse.json({ ok: false, error: "slotId required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("slot_offerings")
    .select(
      `
      id,
      status,
      offered_at,
      responded_at,
      waitlist_entries(id, customer_id, customers(id, full_name, phone, email))
      `
    )
    .eq("slot_id", slotId)
    .order("offered_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const offerings = (data ?? []).map((row: any) => ({
    id: row.id,
    status: row.status,
    offered_at: row.offered_at,
    responded_at: row.responded_at,
    waitlist_entry_id: row.waitlist_entries?.id ?? null,
    customer_id: row.waitlist_entries?.customer_id ?? row.waitlist_entries?.customers?.id ?? null,
    customer_name: row.waitlist_entries?.customers?.full_name ?? null,
    customer_phone: row.waitlist_entries?.customers?.phone ?? null,
    customer_email: row.waitlist_entries?.customers?.email ?? null
  }));

  return NextResponse.json({ ok: true, offerings });
}

import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// GET /api/slots/[slotId]/offerings
// Alias of /api/offerings?slotId=... but with the slotId in the path.
// Same payload shape so consumers can use either.

export async function GET(_req: Request, context: { params: { slotId: string } }) {
  const slotId = context.params.slotId;
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

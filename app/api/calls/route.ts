import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getClinicId } from "@/lib/clinic";

export const runtime = "nodejs";

// GET /api/calls
// Recent call_attempts for the active clinic, joined with the customer and
// slot. Powers the Calls page (filter by status/outcome).

export async function GET(req: Request) {
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");
  const limit = Number(url.searchParams.get("limit") ?? "100");

  const supabase = createSupabaseServiceClient();
  const clinicId = getClinicId();

  let query = supabase
    .from("call_attempts")
    .select(
      `
      id,
      offer_id,
      provider_call_id,
      call_type,
      direction,
      status,
      started_at,
      ended_at,
      duration_seconds,
      transcript,
      extraction,
      recording_url,
      needs_review,
      review_reason,
      slot_id,
      customer_id,
      customers(id, full_name, phone),
      slots(id, start_time, services(name))
      `
    )
    .eq("clinic_id", clinicId)
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(Number.isFinite(limit) ? limit : 100);

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const calls = (data ?? []).map((row: any) => ({
    id: row.id,
    offer_id: row.offer_id,
    provider_call_id: row.provider_call_id,
    call_type: row.call_type,
    direction: row.direction,
    status: row.status,
    started_at: row.started_at,
    ended_at: row.ended_at,
    duration_seconds: row.duration_seconds,
    needs_review: row.needs_review,
    review_reason: row.review_reason,
    transcript: row.transcript,
    extraction: row.extraction,
    recording_url: row.recording_url,
    slot_id: row.slot_id,
    customer_id: row.customer_id,
    customer_name: row.customers?.full_name ?? null,
    customer_phone: row.customers?.phone ?? null,
    slot_start_time: row.slots?.start_time ?? null,
    service_name: row.slots?.services?.name ?? null
  }));

  return NextResponse.json({ ok: true, calls });
}

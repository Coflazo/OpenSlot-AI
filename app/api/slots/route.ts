import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getClinicId } from "@/lib/clinic";

export const runtime = "nodejs";

// GET /api/slots[?status=open|booked|...]
// Returns slots for the active clinic, joined with service name and
// the currently-assigned customer (if any). Powers calendar + open-slots
// pages.

export async function GET(req: Request) {
  const supabase = createSupabaseServiceClient();
  const clinicId = getClinicId();
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");

  let query = supabase
    .from("slots")
    .select(
      `
      id,
      start_time,
      end_time,
      status,
      origin,
      service_id,
      location_id,
      current_customer_id,
      original_customer_id,
      services(name, duration_minutes, estimated_value_eur),
      locations(name),
      current_customer:customers!slots_current_customer_id_fkey(id, full_name, phone, email),
      original_customer:customers!slots_original_customer_id_fkey(id, full_name)
      `
    )
    .eq("clinic_id", clinicId)
    .order("start_time", { ascending: true });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const formatted = (data ?? []).map((slot: any) => ({
    id: slot.id,
    start_time: slot.start_time,
    end_time: slot.end_time,
    status: slot.status,
    origin: slot.origin,
    service_id: slot.service_id,
    location_id: slot.location_id,
    service_name: slot.services?.name ?? null,
    duration_minutes: slot.services?.duration_minutes ?? null,
    estimated_value_eur: slot.services?.estimated_value_eur ?? null,
    location_name: slot.locations?.name ?? null,
    current_customer_id: slot.current_customer_id,
    current_customer_name: slot.current_customer?.full_name ?? null,
    current_customer_phone: slot.current_customer?.phone ?? null,
    current_customer_email: slot.current_customer?.email ?? null,
    original_customer_id: slot.original_customer_id,
    original_customer_name: slot.original_customer?.full_name ?? null
  }));

  return NextResponse.json({ ok: true, slots: formatted });
}

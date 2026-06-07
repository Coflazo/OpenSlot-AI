import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getClinicId } from "@/lib/clinic";

export const runtime = "nodejs";

// GET /api/waitlist
// Active waitlist entries for the active clinic, joined with the customer
// and target service. Powers the waitlist page.

export async function GET() {
  const supabase = createSupabaseServiceClient();
  const clinicId = getClinicId();

  const { data, error } = await supabase
    .from("waitlist_entries")
    .select(
      `
      id,
      type,
      urgency_score,
      preference_match,
      waiting_since,
      status,
      customer_id,
      service_id,
      customers(id, full_name, phone, email, language),
      services(id, name, duration_minutes)
      `
    )
    .eq("clinic_id", clinicId)
    .eq("status", "active")
    .order("waiting_since", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const entries = (data ?? []).map((row: any) => ({
    id: row.id,
    type: row.type,
    urgency_score: row.urgency_score,
    preference_match: row.preference_match,
    waiting_since: row.waiting_since,
    status: row.status,
    customer_id: row.customer_id,
    customer_name: row.customers?.full_name ?? null,
    customer_phone: row.customers?.phone ?? null,
    customer_email: row.customers?.email ?? null,
    customer_language: row.customers?.language ?? null,
    service_id: row.service_id,
    service_name: row.services?.name ?? null,
    duration_minutes: row.services?.duration_minutes ?? null
  }));

  return NextResponse.json({ ok: true, entries });
}

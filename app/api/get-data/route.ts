import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getClinicId } from "@/lib/clinic";

export const runtime = "nodejs";

// GET /api/get-data
// Dashboard aggregator for the Overview page. Returns clinic metadata,
// counts by slot status, waitlist & customer totals, and the most recent
// audit entries. One round-trip = one render.

export async function GET() {
  const supabase = createSupabaseServiceClient();
  const clinicId = getClinicId();

  const [
    clinic,
    services,
    locations,
    slotsByStatus,
    waitlistCount,
    customersCount,
    recentAudit,
    recentCalls
  ] = await Promise.all([
    supabase.from("clinics").select("id, name, timezone").eq("id", clinicId).maybeSingle(),
    supabase.from("services").select("id, name, modality, duration_minutes").eq("clinic_id", clinicId).order("name"),
    supabase.from("locations").select("id, name").eq("clinic_id", clinicId).order("name"),
    supabase.from("slots").select("status").eq("clinic_id", clinicId),
    supabase.from("waitlist_entries").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("status", "active"),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
    supabase.from("audit_log").select("id, action, object_type, object_id, result, at").eq("clinic_id", clinicId).order("at", { ascending: false }).limit(20),
    supabase.from("call_attempts").select("id, status, call_type, started_at, ended_at").eq("clinic_id", clinicId).order("started_at", { ascending: false, nullsFirst: false }).limit(10)
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of (slotsByStatus.data ?? [])) {
    const s = (row as any).status as string;
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    clinic: clinic.data ?? null,
    services: services.data ?? [],
    locations: locations.data ?? [],
    slot_status_counts: statusCounts,
    waitlist_active_count: waitlistCount.count ?? 0,
    customers_count: customersCount.count ?? 0,
    recent_audit: recentAudit.data ?? [],
    recent_calls: recentCalls.data ?? []
  });
}

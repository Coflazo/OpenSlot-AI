import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getClinicId } from "@/lib/clinic";

export const runtime = "nodejs";

// GET /api/customers
// Lists customers for the active clinic. Receptionists use this for booking
// dropdowns and the customers page.

export async function GET() {
  const supabase = createSupabaseServiceClient();
  const clinicId = getClinicId();

  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, phone, email, language, booking_satisfaction, last_contacted_at")
    .eq("clinic_id", clinicId)
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, customers: data ?? [] });
}

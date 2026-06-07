import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get slots with service names and patient names
    const { data: slots, error } = await supabase
      .from("slots")
      .select(
        `
        id,
        starts_at,
        ends_at,
        status,
        booked_patient_id,
        services(name),
        patients(full_name)
      `
      )
      .order("starts_at", { ascending: true });

    if (error) {
      return Response.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    // Format the response
    const formattedSlots = (slots || []).map((slot: any) => ({
      id: slot.id,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      status: slot.status,
      service_name: slot.services?.name || "Unknown Service",
      patient_name: slot.patients?.full_name || null,
      patient_email: slot.patients?.email || null,
      patient_phone: slot.patients?.phone_e164 || null,
      booked_patient_id: slot.booked_patient_id || null,
    }));

    return Response.json(formattedSlots);
  } catch (error) {
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get waitlist entries with patient and service info (only active ones)
    const { data: entries, error } = await supabase
      .from("waitlist_entries")
      .select(
        `
        id,
        status,
        joined_at,
        priority_score_override,
        notes,
        paused_until,
        patients(full_name, email, phone_e164),
        services(name)
      `
      )
      .eq("clinic_id", "59f9d6c2-a9d2-4817-ae73-40b36cb5a9fd")
      .eq("status", "active")
      .order("joined_at", { ascending: false });

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Format the response
    const formattedEntries = (entries || []).map((entry: any) => ({
      id: entry.id,
      full_name: entry.patients?.full_name || "Unknown",
      email: entry.patients?.email || "N/A",
      phone: entry.patients?.phone_e164 || "N/A",
      service_name: entry.services?.name || "Unknown Service",
      status: entry.status,
      joined_at: entry.joined_at,
      priority_score_override: entry.priority_score_override,
      notes: entry.notes,
      paused_until: entry.paused_until,
    }));

    return Response.json(formattedEntries);
  } catch (error) {
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get patients for the clinic
    const { data: patients, error } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("clinic_id", "59f9d6c2-a9d2-4817-ae73-40b36cb5a9fd")
      .limit(20);

    if (error) {
      return Response.json({
        error: error.message,
      });
    }

    return Response.json({
      count: patients?.length || 0,
      patients: patients || [],
    });
  } catch (error) {
    return Response.json({
      error: String(error),
    });
  }
}

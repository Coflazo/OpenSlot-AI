import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get providers
    const { data: providers } = await supabase
      .from("providers")
      .select("id, name")
      .limit(5);

    // Get services
    const { data: services } = await supabase
      .from("services")
      .select("id, name")
      .limit(5);

    // Get clinics
    const { data: clinics } = await supabase
      .from("clinics")
      .select("id, name")
      .limit(5);

    return Response.json({
      providers: providers || [],
      services: services || [],
      clinics: clinics || [],
    });
  } catch (error) {
    return Response.json({
      error: String(error),
    });
  }
}

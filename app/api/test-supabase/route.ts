import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all slots
    const { data: slots, error } = await supabase
      .from("slots")
      .select("*")
      .limit(50);

    if (error) {
      return Response.json({
        error: error.message,
        details: error,
      });
    }

    return Response.json({
      message: "Slots from Supabase",
      count: slots?.length || 0,
      slots,
    });
  } catch (error) {
    return Response.json({
      error: String(error),
    });
  }
}

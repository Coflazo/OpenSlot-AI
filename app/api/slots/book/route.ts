import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: Request) {
  try {
    const { slotId, patientId } = await request.json();

    if (!slotId || !patientId) {
      return Response.json(
        { error: "Slot ID and Patient ID are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update slot to BOOKED and assign patient
    const { data, error } = await supabase
      .from("slots")
      .update({
        status: "BOOKED",
        booked_patient_id: patientId,
      })
      .eq("id", slotId)
      .select();

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      message: "Patient booked successfully",
      data,
    });
  } catch (error) {
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: Request) {
  try {
    const { slotId } = await request.json();
    console.log("[CANCEL_SLOT] 📍 Request received", { slotId });

    if (!slotId) {
      console.error("[CANCEL_SLOT] ❌ Missing slotId");
      return Response.json(
        { error: "Slot ID is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[CANCEL_SLOT] 🔌 Supabase client created");

    // Update slot to OPEN and remove patient
    console.log("[CANCEL_SLOT] 🔄 Updating slot status to OPEN...");
    const { data: updatedSlot, error: updateError } = await supabase
      .from("slots")
      .update({
        status: "OPEN",
        booked_patient_id: null,
      })
      .eq("id", slotId)
      .select();

    if (updateError) {
      console.error("[CANCEL_SLOT] ❌ Update failed", updateError);
      return Response.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    console.log("[CANCEL_SLOT] ✅ Slot updated to OPEN", { slotId });
    return Response.json({
      message: "Slot cancelled - now OPEN",
      data: updatedSlot,
    });
  } catch (error) {
    console.error("[CANCEL_SLOT] ❌ Exception", error);
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

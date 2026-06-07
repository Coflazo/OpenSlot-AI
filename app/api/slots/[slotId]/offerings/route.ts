import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function GET(
  request: Request,
  { params }: { params: { slotId: string } }
) {
  try {
    const slotId = params.slotId;

    if (!slotId) {
      return Response.json(
        { error: "Slot ID is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all offerings for this slot with patient information
    const { data: offerings, error } = await supabase
      .from("slot_offerings")
      .select(
        `
        id,
        status,
        waitlist_entries(
          id,
          patients(id, full_name, email, phone_e164)
        )
      `
      )
      .eq("slot_id", slotId)
      .eq("status", "offering");

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Format the response
    const patients = (offerings || []).map((offering: any) => ({
      id: offering.waitlist_entries?.patients?.id,
      name: offering.waitlist_entries?.patients?.full_name,
      email: offering.waitlist_entries?.patients?.email,
      phone: offering.waitlist_entries?.patients?.phone_e164,
    }));

    return Response.json(patients);
  } catch (error) {
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

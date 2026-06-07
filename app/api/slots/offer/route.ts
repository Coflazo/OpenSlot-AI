import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: Request) {
  try {
    const { slotId } = await request.json();

    if (!slotId) {
      return Response.json(
        { error: "Slot ID is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get the slot details to know which service it offers
    const { data: slot, error: slotError } = await supabase
      .from("slots")
      .select("id, service_id, clinic_id, status")
      .eq("id", slotId)
      .single();

    if (slotError || !slot) {
      return Response.json(
        { error: "Slot not found" },
        { status: 404 }
      );
    }

    // Only proceed if slot is OPEN
    if (slot.status !== "OPEN") {
      return Response.json(
        { error: "Slot is not in OPEN status" },
        { status: 400 }
      );
    }

    // 2. Find patients in waitlist waiting for this same service
    const { data: waitlistEntries, error: waitlistError } = await supabase
      .from("waitlist_entries")
      .select("id, patients(id, full_name, email, phone_e164)")
      .eq("clinic_id", slot.clinic_id)
      .eq("service_id", slot.service_id)
      .eq("status", "active");

    if (waitlistError) {
      console.error("Error fetching waitlist:", waitlistError);
      return Response.json(
        { error: "Error fetching waitlist" },
        { status: 500 }
      );
    }

    // 3. Create slot offerings for each waitlist entry
    if (waitlistEntries && waitlistEntries.length > 0) {
      const offerings = waitlistEntries.map((entry: any) => ({
        slot_id: slotId,
        waitlist_entry_id: entry.id,
        status: "offering",
      }));

      const { error: offeringError } = await supabase
        .from("slot_offerings")
        .insert(offerings);

      if (offeringError) {
        console.error("Error creating offerings:", offeringError);
        return Response.json(
          { error: "Error creating offerings" },
          { status: 500 }
        );
      }

      // 4. Update slot status to OFFERING
      await supabase
        .from("slots")
        .update({ status: "OFFERING" })
        .eq("id", slotId);

      // Format patient data for response
      const patients = waitlistEntries.map((entry: any) => ({
        id: entry.patients?.id,
        name: entry.patients?.full_name,
        email: entry.patients?.email,
        phone: entry.patients?.phone_e164,
      }));

      return Response.json({
        message: "Offerings created and slot status updated to OFFERING",
        patients,
        count: patients.length,
      });
    } else {
      // No waitlist entries found, just return success
      return Response.json({
        message: "No patients found in waitlist",
        patients: [],
        count: 0,
      });
    }
  } catch (error) {
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

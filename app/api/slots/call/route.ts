import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: Request) {
  try {
    const { slotId, patientName, accepted } = await request.json();

    if (!slotId || accepted === undefined) {
      return Response.json(
        { error: "Slot ID and response required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current slot with offerings
    const { data: slot, error: slotError } = await supabase
      .from("slots")
      .select("id, status, booked_patient_id")
      .eq("id", slotId)
      .single();

    if (slotError || !slot) {
      return Response.json({ error: "Slot not found" }, { status: 404 });
    }

    // Get all offerings for this slot
    const { data: offerings, error: offeringsError } = await supabase
      .from("slot_offerings")
      .select("id, waitlist_entries(id, patients(id, full_name))")
      .eq("slot_id", slotId)
      .eq("status", "offering")
      .order("created_at", { ascending: true });

    if (offeringsError) {
      return Response.json(
        { error: "Error fetching offerings" },
        { status: 500 }
      );
    }

    // Find the first offering (current patient being called)
    const firstOffering = offerings?.[0];
    if (!firstOffering) {
      return Response.json(
        { error: "No offerings available" },
        { status: 404 }
      );
    }

    const patientId = firstOffering.waitlist_entries?.patients?.id;

    if (accepted) {
      // Get the waitlist entry ID from the first offering
      const waitlistEntryId = firstOffering.waitlist_entries?.id;

      // Patient accepted! Book the slot
      await supabase
        .from("slots")
        .update({
          status: "BOOKED",
          booked_patient_id: patientId,
        })
        .eq("id", slotId);

      // Mark this offering as accepted
      await supabase
        .from("slot_offerings")
        .update({ status: "accepted" })
        .eq("id", firstOffering.id);

      // Mark all other offerings as rejected
      const otherOfferingIds = offerings
        .slice(1)
        .map((o: any) => o.id);
      if (otherOfferingIds.length > 0) {
        await supabase
          .from("slot_offerings")
          .update({ status: "rejected" })
          .in("id", otherOfferingIds);
      }

      // Mark the waitlist entry as fulfilled
      if (waitlistEntryId) {
        await supabase
          .from("waitlist_entries")
          .update({ status: "fulfilled" })
          .eq("id", waitlistEntryId);
      }

      return Response.json({
        message: "Patient accepted! Slot booked.",
        status: "BOOKED",
        patientId,
        patientName: firstOffering.waitlist_entries?.patients?.full_name,
      });
    } else {
      // Patient rejected, try next one
      await supabase
        .from("slot_offerings")
        .update({ status: "rejected" })
        .eq("id", firstOffering.id);

      // Check if there are more patients to call
      const remainingOfferings = offerings.slice(1);

      if (remainingOfferings.length === 0) {
        // No more patients, escalate
        await supabase
          .from("slots")
          .update({ status: "ESCALATED" })
          .eq("id", slotId);

        return Response.json({
          message: "No more patients. Slot escalated.",
          status: "ESCALATED",
          nextPatient: null,
        });
      }

      // Get next patient info
      const nextPatient = remainingOfferings[0].waitlist_entries?.patients;

      return Response.json({
        message: "Patient rejected. Calling next patient.",
        status: "OFFERING",
        nextPatient: {
          id: nextPatient?.id,
          name: nextPatient?.full_name,
        },
      });
    }
  } catch (error) {
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

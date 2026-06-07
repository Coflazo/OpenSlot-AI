import { createClient } from "@supabase/supabase-js";
import { makeOutboundCall } from "@/lib/fonio/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: Request) {
  try {
    const { slotId, patientPhone, patientName, slotTime, serviceName } =
      await request.json();

    console.log("[START_CALL] 📞 Request received", {
      slotId,
      patientName,
      patientPhone,
      serviceName,
    });

    if (!slotId || !patientPhone) {
      console.error("[START_CALL] ❌ Missing parameters");
      return Response.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[START_CALL] 🔌 Supabase client created");

    // Get slot details to retrieve clinic_id
    console.log("[START_CALL] 🔍 Fetching slot details...");
    const { data: slot, error: slotError } = await supabase
      .from("slots")
      .select("clinic_id")
      .eq("id", slotId)
      .single();

    if (slotError || !slot) {
      console.error("[START_CALL] ❌ Slot not found", slotError);
      return Response.json(
        { error: "Slot not found" },
        { status: 404 }
      );
    }

    console.log("[START_CALL] ✅ Slot found", { clinicId: slot.clinic_id });

    // Get the Supabase Edge Function URL for webhook callback
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/fonio-after-call`;
    console.log("[START_CALL] 🌐 Edge Function URL", { edgeFunctionUrl });

    // Initiate the Fonio call
    console.log("[START_CALL] 📢 Initiating Fonio call...");
    const callResult = await makeOutboundCall(patientPhone, patientName, {
      slotId,
      timeLabel: slotTime || "available slot",
      service: serviceName || "Medical Service",
      webhookUrl: edgeFunctionUrl,
    });

    console.log("[START_CALL] 📊 Fonio response", {
      status: callResult.status,
      callId: callResult.callId,
    });

    if (callResult.status !== "success") {
      console.error("[START_CALL] ❌ Fonio call failed", callResult.message);
      return Response.json(
        {
          error: "Failed to initiate call",
          details: callResult.message,
        },
        { status: 500 }
      );
    }

    // Store the call attempt in database for tracking
    console.log("[START_CALL] 💾 Recording call attempt...");
    const { error: recordError } = await supabase
      .from("call_attempts")
      .insert({
        clinic_id: slot.clinic_id,
        slot_id: slotId,
        provider_call_id: callResult.callId,
        started_at: new Date().toISOString(),
      });

    if (recordError) {
      console.error("[START_CALL] ❌ Failed to record call attempt", recordError);
      // Continue anyway - call was initiated, just not recorded
      console.log("[START_CALL] ⚠️  Call initiated but recording failed, continuing...");
    } else {
      console.log("[START_CALL] ✅ Call recorded successfully");
    }

    console.log("[START_CALL] ✅ Call initiated successfully", {
      callId: callResult.callId,
      patientName,
    });

    return Response.json({
      success: true,
      callId: callResult.callId,
      message: `Calling ${patientName} at ${patientPhone}`,
    });
  } catch (error) {
    console.error("[START_CALL] ❌ Exception", error);
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

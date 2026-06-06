import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// Manual booking confirmation: receptionist clicks "Manually fill" → this route.
// Same idempotency contract as the Fonio post-call → claim_open_slot RPC.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const slotId = body?.slotId as string | undefined;
  const customerId = body?.customerId as string | undefined;
  const offerId = body?.offerId as string | undefined;
  if (!slotId || !customerId || !offerId) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("claim_open_slot", {
    p_slot_id: slotId,
    p_customer_id: customerId,
    p_offer_id: offerId
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

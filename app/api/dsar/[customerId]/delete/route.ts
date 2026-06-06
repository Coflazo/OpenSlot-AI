import { NextRequest, NextResponse } from "next/server";
import { eraseCustomer } from "@/lib/gdpr/dsar";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, context: { params: { customerId: string } }) {
  try {
    const result = await eraseCustomer(context.params.customerId);

    // Audit the erasure itself.
    const supabase = createSupabaseServiceClient();
    await supabase.from("audit_log").insert({
      clinic_id: "00000000-0000-0000-0000-000000000000", // service-role writes; clinic_id resolved upstream
      actor_type: "dsar",
      action: "customer.erase",
      object_type: "customer",
      object_id: context.params.customerId,
      result: "success",
      lawful_basis_tag: "legal_obligation",
      metadata: { anonymized_audit_rows: result.anonymizedAuditRows }
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

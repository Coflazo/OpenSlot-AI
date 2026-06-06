import { NextRequest, NextResponse } from "next/server";
import { commitCustomers } from "@/lib/import/upsertWorkbook";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: { batchId: string } }) {
  const body = await req.json();
  const clinicId = body?.clinicId as string | undefined;
  const rows = body?.rows as Record<string, unknown>[] | undefined;
  if (!clinicId || !Array.isArray(rows)) {
    return NextResponse.json({ error: "missing_clinic_or_rows" }, { status: 400 });
  }

  const result = await commitCustomers(clinicId, rows);

  const supabase = createSupabaseServiceClient();
  await supabase
    .from("import_batches")
    .update({
      status: result.errors.length ? "failed" : "imported",
      row_count: rows.length,
      validation_errors: result.errors
    })
    .eq("id", context.params.batchId);

  return NextResponse.json({ ok: true, result });
}

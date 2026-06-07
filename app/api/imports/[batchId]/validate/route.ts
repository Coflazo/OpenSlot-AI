import { NextRequest, NextResponse } from "next/server";
import { validateCustomersSheet } from "@/lib/import/validateWorkbook";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: { batchId: string } }) {
  const body = await req.json();
  const sheet = body?.sheet as { sheetName: string; columns: string[]; rows: Record<string, unknown>[] };
  if (!sheet?.rows) {
    return NextResponse.json({ error: "missing_sheet" }, { status: 400 });
  }

  const validation = validateCustomersSheet({
    sheetName: sheet.sheetName,
    columns: sheet.columns,
    rows: sheet.rows
  });

  const supabase = createSupabaseServiceClient();
  await supabase
    .from("import_batches")
    .update({
      status: validation.errors.some((e) => e.severity === "error") ? "uploaded" : "validated",
      row_count: validation.totalCount,
      validation_errors: validation.errors
    })
    .eq("id", context.params.batchId);

  return NextResponse.json({ ok: true, validation });
}

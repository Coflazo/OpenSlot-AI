import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const clinicId = form.get("clinicId");
  if (!(file instanceof File) || typeof clinicId !== "string") {
    return NextResponse.json({ error: "missing_file_or_clinic" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const batchId = nanoid();
  const path = `imports/${clinicId}/${batchId}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const upload = await supabase.storage.from("imports").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const { data: batch, error } = await supabase
    .from("import_batches")
    .insert({
      id: batchId,
      clinic_id: clinicId,
      file_name: file.name,
      storage_path: path,
      status: "uploaded",
      row_count: 0
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, batchId, batch });
}

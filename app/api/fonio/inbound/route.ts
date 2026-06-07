import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

function tokenValid(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.FONIO_WEBHOOK_TOKEN;
  return !!token && !!expected && token === expected;
}

export async function POST(req: NextRequest) {
  if (!tokenValid(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fromNumber = body?.fromNumber as string | undefined;
  const toNumber = body?.toNumber as string | undefined;

  // Inbound flows are out of MVP scope but we log them so the operator can see them.
  const supabase = createSupabaseServiceClient();
  await supabase.from("call_attempts").insert({
    clinic_id: body?.clinicId ?? "00000000-0000-0000-0000-000000000000",
    offer_id: `inbound_${nanoid(10)}`,
    direction: "inbound",
    call_type: "inbound_triage",
    provider_call_id: body?.callId ?? null,
    status: "in_progress",
    started_at: new Date().toISOString(),
    extraction: { fromNumber, toNumber }
  });

  return NextResponse.json({ ok: true });
}

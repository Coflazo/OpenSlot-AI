import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const calendarId = body?.calendarId as string | undefined;
  if (!calendarId) {
    return NextResponse.json({ error: "missing_calendar_id" }, { status: 400 });
  }
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("google_calendar_connections")
    .update({ disconnected_at: new Date().toISOString() })
    .eq("calendar_id", calendarId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

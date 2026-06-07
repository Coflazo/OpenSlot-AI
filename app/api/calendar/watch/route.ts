import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createCalendarClientFromConnection } from "@/lib/google/calendar";
import { randomToken } from "@/lib/security/crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServiceClient();
  const body = await req.json().catch(() => ({}));
  const connectionId = body?.connectionId as string | undefined;
  if (!connectionId) {
    return NextResponse.json({ error: "missing_connection_id" }, { status: 400 });
  }

  const { data: conn, error } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("id", connectionId)
    .single();
  if (error || !conn) {
    return NextResponse.json({ error: "connection_not_found" }, { status: 404 });
  }

  const calendar = createCalendarClientFromConnection({
    calendarId: conn.calendar_id,
    accessTokenEncrypted: conn.access_token_encrypted,
    refreshTokenEncrypted: conn.refresh_token_encrypted,
    tokenExpiry: conn.token_expiry
  });

  const channelId = `openslot-${connectionId}-${randomToken(6)}`;
  const watchToken = randomToken(24);

  const resp = await calendar.events.watch({
    calendarId: conn.calendar_id,
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: `${req.nextUrl.origin}/api/calendar/webhook?token=${watchToken}`,
      token: watchToken
    }
  });

  await supabase
    .from("google_calendar_connections")
    .update({
      watch_channel_id: resp.data.id ?? channelId,
      watch_resource_id: resp.data.resourceId,
      watch_expires_at: resp.data.expiration
        ? new Date(Number(resp.data.expiration)).toISOString()
        : null
    })
    .eq("id", connectionId);

  return NextResponse.json({ ok: true, expires: resp.data.expiration });
}

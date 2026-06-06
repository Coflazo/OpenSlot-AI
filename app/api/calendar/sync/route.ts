import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { pullCalendarChanges } from "@/lib/google/sync";
import type { StoredConnection } from "@/lib/google/calendar";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServiceClient();
  const body = await req.json().catch(() => ({}));
  const clinicId = body?.clinicId as string | undefined;

  const { data: conns } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .is("disconnected_at", null)
    .match(clinicId ? { clinic_id: clinicId } : {});

  if (!conns?.length) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  let total = { added: 0, updated: 0, cancelled: 0 };
  for (const conn of conns) {
    const stored: StoredConnection = {
      calendarId: conn.calendar_id,
      accessTokenEncrypted: conn.access_token_encrypted,
      refreshTokenEncrypted: conn.refresh_token_encrypted,
      tokenExpiry: conn.token_expiry
    };
    try {
      const { result } = await pullCalendarChanges(stored, { lastSyncToken: conn.sync_token ?? undefined });
      total = {
        added: total.added + result.added,
        updated: total.updated + result.updated,
        cancelled: total.cancelled + result.cancelled
      };
      if (result.nextSyncToken) {
        await supabase
          .from("google_calendar_connections")
          .update({ sync_token: result.nextSyncToken })
          .eq("id", conn.id);
      }
      // NOTE: Full event-to-slot upsert is out of scope here. The connector
      // contract is stable; populate slots in a follow-up worker by calling
      // pullCalendarChanges and mapping events → slot rows.
    } catch (err) {
      await supabase.from("audit_log").insert({
        clinic_id: conn.clinic_id,
        actor_type: "system",
        action: "calendar.sync.failed",
        object_type: "google_calendar_connection",
        object_id: conn.id,
        result: "error",
        lawful_basis_tag: "legitimate_interest",
        metadata: { error: String(err) }
      });
    }
  }

  return NextResponse.json({ ok: true, ...total });
}

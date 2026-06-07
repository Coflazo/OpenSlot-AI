import type { calendar_v3 } from "googleapis";
import { createCalendarClientFromConnection, type StoredConnection } from "./calendar";

export interface SyncResult {
  added: number;
  updated: number;
  cancelled: number;
  nextSyncToken?: string;
}

// Incremental sync using syncToken. On first run (no syncToken yet) we pull
// a 60-day window. On subsequent runs we ask Google for "what changed".
export async function pullCalendarChanges(
  conn: StoredConnection,
  opts: { lastSyncToken?: string; lookaheadDays?: number } = {}
): Promise<{
  result: SyncResult;
  events: calendar_v3.Schema$Event[];
}> {
  const calendar = createCalendarClientFromConnection(conn);
  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  const result: SyncResult = { added: 0, updated: 0, cancelled: 0 };

  do {
    const resp: { data: calendar_v3.Schema$Events } = await calendar.events.list({
      calendarId: conn.calendarId,
      syncToken: opts.lastSyncToken,
      pageToken,
      timeMin: opts.lastSyncToken ? undefined : new Date().toISOString(),
      timeMax: opts.lastSyncToken
        ? undefined
        : new Date(Date.now() + (opts.lookaheadDays ?? 60) * 86_400_000).toISOString(),
      maxResults: 250,
      showDeleted: true,
      singleEvents: true
    });

    for (const ev of resp.data.items ?? []) {
      events.push(ev);
      if (ev.status === "cancelled") result.cancelled++;
      else if (ev.created === ev.updated) result.added++;
      else result.updated++;
    }
    pageToken = resp.data.nextPageToken ?? undefined;
    nextSyncToken = resp.data.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  result.nextSyncToken = nextSyncToken;
  return { result, events };
}

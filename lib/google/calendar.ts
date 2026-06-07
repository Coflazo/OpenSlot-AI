import { google, type calendar_v3 } from "googleapis";
import { decryptSecret } from "../security/crypto";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy"
];

export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export interface StoredConnection {
  calendarId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  tokenExpiry: string;
}

export function createCalendarClientFromConnection(conn: StoredConnection) {
  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: decryptSecret(conn.accessTokenEncrypted),
    refresh_token: decryptSecret(conn.refreshTokenEncrypted),
    expiry_date: new Date(conn.tokenExpiry).getTime()
  });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

function sanitizeEventId(slotId: string): string {
  // Google rejects most non-alphanumerics; build an idempotent one.
  return `openslot${slotId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 56)}`;
}

export async function upsertSlotEvent(params: {
  calendar: calendar_v3.Calendar;
  calendarId: string;
  slotId: string;
  service: string;
  customerName: string;
  startTime: string;
  endTime: string;
  location: string;
  status: "booked" | "open" | "filled" | "cancelled";
  timezone?: string;
}) {
  const { calendar, calendarId } = params;
  const eventId = sanitizeEventId(params.slotId);
  const tz = params.timezone ?? "Europe/Vienna";

  const event: calendar_v3.Schema$Event = {
    id: eventId,
    summary: `${params.service} · ${params.customerName}`,
    location: params.location,
    description: `Managed by OpenSlot AI. Status: ${params.status}.`,
    start: { dateTime: params.startTime, timeZone: tz },
    end: { dateTime: params.endTime, timeZone: tz },
    extendedProperties: {
      private: {
        openslotSlotId: params.slotId,
        openslotStatus: params.status
      }
    },
    status: params.status === "cancelled" ? "cancelled" : "confirmed"
  };

  try {
    return await calendar.events.update({
      calendarId,
      eventId,
      requestBody: event
    });
  } catch (err: unknown) {
    const status =
      err && typeof err === "object" && "code" in err && typeof (err as { code?: number }).code === "number"
        ? (err as { code: number }).code
        : 0;
    if (status === 404) {
      return await calendar.events.insert({
        calendarId,
        requestBody: event,
        sendUpdates: "none"
      });
    }
    throw err;
  }
}

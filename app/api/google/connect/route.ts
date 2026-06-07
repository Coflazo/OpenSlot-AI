import { NextResponse } from "next/server";
import { createGoogleOAuthClient, GOOGLE_SCOPES } from "@/lib/google/calendar";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      {
        ok: false,
        reason: "google_calendar_not_configured",
        hint: "Google Calendar is optional. Add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to .env to enable two-way sync."
      },
      { status: 503 }
    );
  }
  const oauth = createGoogleOAuthClient();
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true
  });
  return NextResponse.redirect(url);
}

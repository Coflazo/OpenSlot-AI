import { NextResponse } from "next/server";
import { createGoogleOAuthClient, GOOGLE_SCOPES } from "@/lib/google/calendar";

export const runtime = "nodejs";

export async function GET() {
  const oauth = createGoogleOAuthClient();
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true
  });
  return NextResponse.redirect(url);
}

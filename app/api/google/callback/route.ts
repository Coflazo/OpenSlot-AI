import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createGoogleOAuthClient } from "@/lib/google/calendar";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret } from "@/lib/security/crypto";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }

  const oauth = createGoogleOAuthClient();
  const { tokens } = await oauth.getToken(code);
  oauth.setCredentials(tokens);

  const calendar = google.calendar({ version: "v3", auth: oauth });
  const list = await calendar.calendarList.list();
  const primary = list.data.items?.find((c) => c.primary) ?? list.data.items?.[0];
  if (!primary?.id) {
    return NextResponse.json({ error: "no_calendar_found" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  // For now: assume the first clinic membership of the calling user.
  // Production: read clinic_id from the session.
  const { data: members, error: memberErr } = await supabase
    .from("clinic_members")
    .select("clinic_id, user_id")
    .limit(1);
  if (memberErr || !members?.[0]) {
    return NextResponse.json({ error: "no_clinic_membership", details: memberErr?.message }, { status: 400 });
  }

  const { clinic_id, user_id } = members[0];

  await supabase.from("google_calendar_connections").upsert(
    {
      clinic_id,
      user_id,
      google_account_email: primary.id!,
      calendar_id: primary.id!,
      access_token_encrypted: encryptSecret(tokens.access_token ?? ""),
      refresh_token_encrypted: encryptSecret(tokens.refresh_token ?? ""),
      scope: tokens.scope ?? "",
      token_expiry: new Date(tokens.expiry_date ?? Date.now() + 3_600_000).toISOString()
    },
    { onConflict: "clinic_id,calendar_id" }
  );

  await supabase.from("audit_log").insert({
    clinic_id,
    actor_type: "user",
    action: "google_calendar.connect",
    object_type: "google_calendar_connection",
    object_id: primary.id!,
    result: "success",
    lawful_basis_tag: "legitimate_interest",
    metadata: { email: primary.id, scope: tokens.scope }
  });

  const origin = req.nextUrl.origin;
  return NextResponse.redirect(`${origin}/integrations?connected=google-calendar`);
}

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Google Calendar pushes notifications here. Headers include:
// X-Goog-Channel-Id, X-Goog-Resource-State, X-Goog-Channel-Token.
// Acknowledge fast (≤200ms) — schedule the actual sync work elsewhere.
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const headerToken = req.headers.get("x-goog-channel-token");
  if (!token || !headerToken || token !== headerToken) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // In production we'd enqueue a job to call /api/calendar/sync.
  // For now we just ack — the polling sync route covers correctness.
  const channelId = req.headers.get("x-goog-channel-id");
  const state = req.headers.get("x-goog-resource-state");
  console.log(`[google-webhook] channel=${channelId} state=${state}`);
  return NextResponse.json({ ok: true });
}

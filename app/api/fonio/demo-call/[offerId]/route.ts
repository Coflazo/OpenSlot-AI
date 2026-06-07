import { NextRequest, NextResponse } from "next/server";
import { getDemoCall } from "@/lib/fonio/demoCallStore";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: { offerId: string } }) {
  const call = getDemoCall(context.params.offerId);
  if (!call) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, call });
}

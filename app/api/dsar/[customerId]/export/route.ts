import { NextRequest, NextResponse } from "next/server";
import { exportCustomerDSAR } from "@/lib/gdpr/dsar";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: { customerId: string } }) {
  const data = await exportCustomerDSAR(context.params.customerId);
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="dsar_${context.params.customerId}.json"`
    }
  });
}

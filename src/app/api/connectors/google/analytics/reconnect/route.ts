import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/api/connectors/google/connect?returnTo=/apps/analytics/connectors/google", req.nextUrl.origin));
}

import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ connected: false, evidence: null, message: "Meta evidence becomes available after OAuth and resource selection." });
}

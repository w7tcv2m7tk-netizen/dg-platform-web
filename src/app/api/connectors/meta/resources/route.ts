import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ connected: false, pages: [], instagramAccounts: [], adAccounts: [], message: "Connect Meta before choosing resources." });
}

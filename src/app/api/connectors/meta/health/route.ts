import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const credentialsConfigured = Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim());
  return NextResponse.json({ connected: false, credentialsConfigured, state: credentialsConfigured ? "ready_for_oauth_implementation" : "credentials_required" });
}

import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const configured = Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim());
  return NextResponse.json({ configured, status: configured ? "credentials_ready" : "credentials_required", redirectUri: process.env.META_REDIRECT_URI?.trim() || "https://app.digitalgate.com.au/api/connectors/meta/callback" });
}

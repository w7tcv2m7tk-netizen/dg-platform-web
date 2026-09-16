import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  return NextResponse.json({ platformCredentials: appId && appSecret ? "configured" : "not_configured", redirectUri: process.env.META_REDIRECT_URI?.trim() || "https://app.digitalgate.com.au/api/connectors/meta/callback", oauthEnabled: false });
}

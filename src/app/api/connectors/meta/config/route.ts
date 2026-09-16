import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ redirectUri: process.env.META_REDIRECT_URI?.trim() || "https://app.digitalgate.com.au/api/connectors/meta/callback", credentialsConfigured: Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim()) });
}

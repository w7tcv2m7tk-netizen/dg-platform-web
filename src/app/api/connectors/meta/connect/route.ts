import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const configured = Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim());
  if (!configured) return NextResponse.json({ error: { code: "meta_not_configured", message: "META_APP_ID and META_APP_SECRET are required before Meta OAuth can be enabled." }, redirectUri: process.env.META_REDIRECT_URI?.trim() || "https://app.digitalgate.com.au/api/connectors/meta/callback" }, { status: 503 });
  return NextResponse.json({ error: { code: "meta_oauth_pending", message: "Meta credentials are configured. OAuth will be enabled after the organisation-scoped token store and permission set are finalised." }, origin: req.nextUrl.origin }, { status: 503 });
}

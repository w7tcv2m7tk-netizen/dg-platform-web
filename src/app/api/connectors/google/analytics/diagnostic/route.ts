import { getOrgGoogleGbpConnectorTokens } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { getPlatformPageContext } from "@/lib/platform-page-context";
export const dynamic = "force-dynamic";
const ANALYTICS = "https://www.googleapis.com/auth/analytics.readonly";
const SEARCH = "https://www.googleapis.com/auth/webmasters.readonly";
export async function GET() {
  const { session } = await getPlatformPageContext();
  if (!session?.organisationId) return NextResponse.json({ error: "No active organisation" }, { status: 401 });
  const token = await getOrgGoogleGbpConnectorTokens(session.organisationId);
  const scopes = new Set((token?.scope ?? "").split(/\s+/).filter(Boolean));
  return NextResponse.json({ googleConnected: Boolean(token?.accessToken || token?.refreshToken), permissions: { analytics: scopes.has(ANALYTICS), searchConsole: scopes.has(SEARCH), businessProfile: scopes.has("https://www.googleapis.com/auth/business.manage") } });
}

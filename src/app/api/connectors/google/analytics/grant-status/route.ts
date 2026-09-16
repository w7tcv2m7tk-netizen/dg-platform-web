import { getOrgGoogleGbpConnectorTokens } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { getPlatformPageContext } from "@/lib/platform-page-context";
export const dynamic = "force-dynamic";
const REQUIRED = ["https://www.googleapis.com/auth/analytics.readonly", "https://www.googleapis.com/auth/webmasters.readonly"];
export async function GET() {
  const { session } = await getPlatformPageContext();
  if (!session?.organisationId) return NextResponse.json({ connected: false, analyticsAccess: false }, { status: 401 });
  const tokens = await getOrgGoogleGbpConnectorTokens(session.organisationId);
  const granted = new Set((tokens?.scope ?? "").split(/\s+/).filter(Boolean));
  return NextResponse.json({ connected: Boolean(tokens?.accessToken || tokens?.refreshToken), analyticsAccess: REQUIRED.every((scope) => granted.has(scope)) });
}

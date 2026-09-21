import { buildGoogleAuthorizeUrl, googleCredentialsConfigured } from "@dg/platform-core";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { requirePermission } from "@/lib/platform-api";
import { tenantWriteEntitlementBlock, writeEntitlementResponse } from "@/lib/write-entitlement";
import { fetchPortalMe } from "@/lib/dg-api";
import { createGoogleOAuthState } from "@/lib/google-oauth-state";
import { gbpOAuthReturnPath } from "@/lib/oauth-return-path";

export const dynamic = "force-dynamic";
const GOOGLE_ANALYTICS_REQUIRED_SCOPES = ["openid","email","profile","https://www.googleapis.com/auth/business.manage","https://www.googleapis.com/auth/analytics.readonly","https://www.googleapis.com/auth/webmasters.readonly"].join(" ");
const GOOGLE_ADS_REQUIRED_SCOPES = ["openid","email","profile","https://www.googleapis.com/auth/adwords"].join(" ");
const YOUTUBE_REQUIRED_SCOPES = ["openid","email","profile","https://www.googleapis.com/auth/youtube.readonly","https://www.googleapis.com/auth/yt-analytics.readonly"].join(" ");

export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(req.url).origin || "https://app.digitalgate.com.au";
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/login", appUrl));
  if (!googleCredentialsConfigured()) return NextResponse.json({ error: { code: "google_not_configured", message: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing on this deployment" } }, { status: 503 });
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName ?? [user?.firstName, user?.lastName].filter(Boolean).join(" ") ?? email;
  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = await resolveActivePlatformSession({ clerkUserId: userId, email, name, orgName: portal?.org_name });
  if (!session) return NextResponse.json({ error: { code: "no_org", message: "No active organisation" } }, { status: 400 });
  const denied = requirePermission(session, { module: "settings", action: "manage", scope: "organisation" });
  if (denied) return denied;
  const writeBlock = await tenantWriteEntitlementBlock(session);
  if (writeBlock) return writeEntitlementResponse(writeBlock);

  const returnTo = gbpOAuthReturnPath(new URL(req.url).searchParams.get("returnTo"));
  const analyticsMode = returnTo === "/apps/analytics/connectors/google";
  const adsMode = returnTo === "/apps/advertising";
  const youtubeMode = returnTo === "/apps/social/accounts";
  let state: string;
  try {
    state = createGoogleOAuthState(session.organisationId, { returnTo, mode: analyticsMode ? "analytics" : adsMode ? "ads" : youtubeMode ? "youtube" : "gbp" });
  } catch (err) {
    return NextResponse.json({ error: { code: "google_state", message: err instanceof Error ? err.message : "Could not create OAuth state" } }, { status: 503 });
  }

  const authUrl = buildGoogleAuthorizeUrl({ state, scopes: analyticsMode ? GOOGLE_ANALYTICS_REQUIRED_SCOPES : adsMode ? GOOGLE_ADS_REQUIRED_SCOPES : youtubeMode ? YOUTUBE_REQUIRED_SCOPES : undefined });
  if (!authUrl.ok) return NextResponse.json({ error: { code: "google_config", message: authUrl.message } }, { status: 503 });
  return NextResponse.redirect(authUrl.url);
}

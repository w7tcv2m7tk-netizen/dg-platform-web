import {
  exchangeGoogleAuthorizationCode,
  saveOrgGoogleGbpConnectorTokens,
  syncOrgGoogleGbp,
} from "@dg/platform-core";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "dg_google_oauth_state";
const ORG_COOKIE = "dg_google_oauth_org";

/**
 * Google OAuth redirect —
 * https://app.digitalgate.com.au/api/connectors/google/callback
 */
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.digitalgate.com.au";
  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(
        `/dashboard/settings/connectors?google=error&message=${encodeURIComponent(msg)}`,
        appUrl,
      ),
    );

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(
      new URL(`/login?redirect_url=${encodeURIComponent(req.url)}`, appUrl),
    );
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) {
    return fail(req.nextUrl.searchParams.get("error_description") || oauthError);
  }
  if (!code || !state) {
    return fail("Missing code or state from Google");
  }

  const jar = await cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  const organisationId = jar.get(ORG_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  jar.delete(ORG_COOKIE);

  if (!expectedState || expectedState !== state) {
    return fail("OAuth state mismatch — try Connect Google again");
  }
  if (!organisationId) {
    return fail("Missing organisation context — try Connect Google again");
  }

  const exchanged = await exchangeGoogleAuthorizationCode({ code });
  if (!exchanged.ok) {
    return fail(exchanged.message);
  }

  try {
    await saveOrgGoogleGbpConnectorTokens(organisationId, {
      accessToken: exchanged.token.access_token,
      refreshToken: exchanged.token.refresh_token,
      expiresAt: exchanged.token.expiresAt,
      scope: exchanged.token.scope,
      connectedAt: new Date().toISOString(),
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to save Google tokens");
  }

  // Best-effort first sync so locations appear immediately after connect
  try {
    await syncOrgGoogleGbp(organisationId);
  } catch {
    /* sync can be retried from Settings / Reputation sources */
  }

  return NextResponse.redirect(
    new URL("/dashboard/settings/connectors?google=connected", appUrl),
  );
}

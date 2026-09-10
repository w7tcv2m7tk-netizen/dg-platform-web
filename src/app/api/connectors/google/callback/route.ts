import {
  exchangeGoogleAuthorizationCode,
  saveOrgGoogleGbpConnectorTokens,
  syncOrgGoogleGbp,
} from "@dg/platform-core";
import { NextRequest, NextResponse } from "next/server";

import { parseGoogleOAuthState } from "@/lib/google-oauth-state";
import {
  DEFAULT_GBP_OAUTH_RETURN,
  OAUTH_RETURN_COOKIE,
  OAUTH_RETURN_COOKIE_MAX_AGE_SEC,
  gbpOAuthReturnPath,
  withGbpOAuthFlash,
} from "@/lib/oauth-return-path";
import { tenantWriteEntitlementBlock } from "@/lib/write-entitlement";

export const dynamic = "force-dynamic";

/**
 * Google OAuth redirect —
 * https://app.digitalgate.com.au/api/connectors/google/callback
 *
 * Organisation id + return path travel in signed OAuth `state`.
 * Do not send a successful connect through /login — Clerk force-redirects
 * that to Overview (/dashboard).
 */
export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin;

  const finish = (
    returnTo: string,
    status: "connected" | "error",
    message?: string,
  ) => {
    const dest = withGbpOAuthFlash(returnTo, status, message);
    const res = NextResponse.redirect(new URL(dest, base));
    res.cookies.set(OAUTH_RETURN_COOKIE, dest, {
      path: "/",
      maxAge: OAUTH_RETURN_COOKIE_MAX_AGE_SEC,
      sameSite: "lax",
      httpOnly: true,
      secure: base.startsWith("https://"),
    });
    return res;
  };

  let returnTo = DEFAULT_GBP_OAUTH_RETURN;
  const fail = (msg: string) => finish(returnTo, "error", msg);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) {
    return fail(req.nextUrl.searchParams.get("error_description") || oauthError);
  }
  if (!code || !state) {
    return fail("Missing code or state from Google");
  }

  const parsed = parseGoogleOAuthState(state);
  if (!parsed.ok) {
    return fail(parsed.message);
  }
  returnTo = gbpOAuthReturnPath(parsed.returnTo);
  const organisationId = parsed.organisationId;

  const writeBlock = await tenantWriteEntitlementBlock({ organisationId });
  if (writeBlock) return fail(writeBlock.message);

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

  try {
    await syncOrgGoogleGbp(organisationId);
  } catch {
    /* sync can be retried from Settings / Reputation sources */
  }

  return finish(returnTo, "connected");
}

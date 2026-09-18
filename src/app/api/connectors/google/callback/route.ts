import { exchangeGoogleAuthorizationCode, getOrgGoogleGbpConnectorTokens, saveOrgGoogleGbpConnectorTokens, syncOrgGoogleGbp } from "@dg/platform-core";
import { NextRequest, NextResponse } from "next/server";
import { parseGoogleOAuthState } from "@/lib/google-oauth-state";
import { logGoogleOAuthCallbackFailure } from "@/lib/google-oauth-callback-stage";
import { DEFAULT_GBP_OAUTH_RETURN, OAUTH_RETURN_COOKIE, OAUTH_RETURN_COOKIE_MAX_AGE_SEC, gbpOAuthReturnPath, withGbpOAuthFlash } from "@/lib/oauth-return-path";
import { tenantWriteEntitlementBlock } from "@/lib/write-entitlement";
export const dynamic = "force-dynamic";

const ANALYTICS_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
] as const;

function missingAnalyticsScopes(scope: string): string[] {
  const granted = new Set(scope.split(/\s+/).filter(Boolean));
  return ANALYTICS_REQUIRED_SCOPES.filter((required) => !granted.has(required));
}

export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin;
  const finish = (returnTo: string, status: "connected" | "error", message?: string) => {
    const dest = withGbpOAuthFlash(returnTo, status, message);
    const res = NextResponse.redirect(new URL(dest, base));
    res.cookies.set(OAUTH_RETURN_COOKIE, dest, { path: "/", maxAge: OAUTH_RETURN_COOKIE_MAX_AGE_SEC, sameSite: "lax", httpOnly: true, secure: base.startsWith("https://") });
    return res;
  };
  let returnTo = DEFAULT_GBP_OAUTH_RETURN;
  let mode: "analytics" | "ads" | "youtube" | "gbp" | undefined;
  const fail = (stage: Parameters<typeof logGoogleOAuthCallbackFailure>[0], msg: string) => {
    logGoogleOAuthCallbackFailure(stage, { mode, message: msg });
    return finish(returnTo, "error", msg);
  };
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  let parsedState: ReturnType<typeof parseGoogleOAuthState> | null = null;
  if (state) {
    parsedState = parseGoogleOAuthState(state);
    if (parsedState.ok) {
      mode = parsedState.mode;
      returnTo = parsedState.mode === "analytics" ? "/apps/analytics/connectors/google" : parsedState.mode === "ads" ? "/apps/advertising" : parsedState.mode === "youtube" ? "/apps/social/accounts" : gbpOAuthReturnPath(parsedState.returnTo);
    }
  }

  if (oauthError) return fail("oauth_error", req.nextUrl.searchParams.get("error_description") || oauthError);
  if (!code || !state) return fail("missing_code_state", "Missing code or state from Google");
  const parsed = parsedState ?? parseGoogleOAuthState(state);
  if (!parsed.ok) return fail("invalid_state", parsed.message);
  mode = parsed.mode;
  returnTo = parsed.mode === "analytics" ? "/apps/analytics/connectors/google" : parsed.mode === "ads" ? "/apps/advertising" : parsed.mode === "youtube" ? "/apps/social/accounts" : gbpOAuthReturnPath(parsed.returnTo);
  const organisationId = parsed.organisationId;
  const writeBlock = await tenantWriteEntitlementBlock({ organisationId });
  if (writeBlock) return fail("write_blocked", writeBlock.message);
  const exchanged = await exchangeGoogleAuthorizationCode({ code });
  if (!exchanged.ok) return fail("token_exchange_failed", exchanged.message);

  if (parsed.mode === "ads" && !(exchanged.token.scope || "").split(/\s+/).includes("https://www.googleapis.com/auth/adwords")) {
    return fail("missing_analytics_scopes", "Google did not grant the required Google Ads permission.");
  }

  if (parsed.mode === "youtube") {
    const granted = new Set((exchanged.token.scope || "").split(/\\s+/).filter(Boolean));
    const required = ["https://www.googleapis.com/auth/youtube.readonly","https://www.googleapis.com/auth/yt-analytics.readonly"];
    const missing = required.filter(scope => !granted.has(scope));
    if (missing.length) return fail("missing_analytics_scopes", `Google did not grant ${missing.length} required YouTube permission(s).`);
  }

  if (parsed.mode === "analytics") {
    const missing = missingAnalyticsScopes(exchanged.token.scope || "");
    if (missing.length) {
      return fail("missing_analytics_scopes", `Google did not grant ${missing.length} required Analytics/Search Console permission(s).`);
    }
  }

  try {
    // Google is one organisation-scoped business connection. Re-authorising for
    // Analytics/Search Console must enrich the OAuth token without erasing the
    // already assigned GBP resources, health and cached evidence.
    const existing = await getOrgGoogleGbpConnectorTokens(organisationId);
    await saveOrgGoogleGbpConnectorTokens(organisationId, {
      ...(existing ?? {}),
      accessToken: exchanged.token.access_token,
      refreshToken: exchanged.token.refresh_token || existing?.refreshToken,
      expiresAt: exchanged.token.expiresAt,
      scope: exchanged.token.scope || existing?.scope,
      connectedAt: new Date().toISOString(),
      lastError: undefined,
    });
  } catch (err) {
    return fail("token_save_failed", err instanceof Error ? err.message : "Failed to save Google tokens");
  }
  try { await syncOrgGoogleGbp(organisationId); } catch { /* GBP remains best-effort. */ }
  if (parsed.mode === "analytics") {
    const continuation = new URL("/api/connectors/google/analytics/continue", base);
    continuation.searchParams.set("status", "connected");
    return NextResponse.redirect(continuation);
  }
  return finish(returnTo, "connected");
}

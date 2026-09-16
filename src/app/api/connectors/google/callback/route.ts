import { exchangeGoogleAuthorizationCode, saveOrgGoogleGbpConnectorTokens, syncOrgGoogleGbp } from "@dg/platform-core";
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
  let mode: "analytics" | "gbp" | undefined;
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
      returnTo = parsedState.mode === "analytics" ? "/apps/analytics/connectors/google" : gbpOAuthReturnPath(parsedState.returnTo);
    }
  }

  if (oauthError) return fail("oauth_error", req.nextUrl.searchParams.get("error_description") || oauthError);
  if (!code || !state) return fail("missing_code_state", "Missing code or state from Google");
  const parsed = parsedState ?? parseGoogleOAuthState(state);
  if (!parsed.ok) return fail("invalid_state", parsed.message);
  mode = parsed.mode;
  returnTo = parsed.mode === "analytics" ? "/apps/analytics/connectors/google" : gbpOAuthReturnPath(parsed.returnTo);
  const organisationId = parsed.organisationId;
  const writeBlock = await tenantWriteEntitlementBlock({ organisationId });
  if (writeBlock) return fail("write_blocked", writeBlock.message);
  const exchanged = await exchangeGoogleAuthorizationCode({ code });
  if (!exchanged.ok) return fail("token_exchange_failed", exchanged.message);

  if (parsed.mode === "analytics" && exchanged.token.scope) {
    const missing = missingAnalyticsScopes(exchanged.token.scope);
    if (missing.length) {
      return fail("missing_analytics_scopes", `Google did not grant ${missing.length} required Analytics/Search Console permission(s).`);
    }
  }

  try {
    await saveOrgGoogleGbpConnectorTokens(organisationId, { accessToken: exchanged.token.access_token, refreshToken: exchanged.token.refresh_token, expiresAt: exchanged.token.expiresAt, scope: exchanged.token.scope, connectedAt: new Date().toISOString() });
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

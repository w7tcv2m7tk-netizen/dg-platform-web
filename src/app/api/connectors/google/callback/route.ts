import {
  exchangeGoogleAuthorizationCode,
  saveOrgGoogleGbpConnectorTokens,
  syncOrgGoogleGbp,
} from "@dg/platform-core";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { parseGoogleOAuthState } from "@/lib/google-oauth-state";
import { tenantWriteEntitlementBlock } from "@/lib/write-entitlement";

export const dynamic = "force-dynamic";

/**
 * Google OAuth redirect —
 * https://app.digitalgate.com.au/api/connectors/google/callback
 *
 * Organisation id travels in signed OAuth `state` (not cookies), so the
 * Google round-trip cannot drop org context. Callback is a public Clerk route.
 */
export async function GET(req: NextRequest) {
  // Always return to the host Google hit — ignore a wrong NEXT_PUBLIC_APP_URL.
  const base = req.nextUrl.origin;
  const connectorsOk = () =>
    NextResponse.redirect(
      new URL("/dashboard/settings/connectors?google=connected", base),
    );
  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(
        `/dashboard/settings/connectors?google=error&message=${encodeURIComponent(msg)}`,
        base,
      ),
    );

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

  const { userId } = await auth();
  if (!userId) {
    const after = `/dashboard/settings/connectors?google=connected`;
    return NextResponse.redirect(
      new URL(`/login?redirect_url=${encodeURIComponent(after)}`, base),
    );
  }

  return connectorsOk();
}

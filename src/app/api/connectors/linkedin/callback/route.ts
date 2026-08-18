import {
  exchangeLinkedInAuthorizationCode,
  probeOrgLinkedInConnection,
  saveOrgLinkedInConnectorTokens,
} from "@dg/platform-core";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { parseLinkedInOAuthState } from "@/lib/linkedin-oauth-state";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/apps/social/accounts";

/**
 * LinkedIn OAuth redirect —
 * https://app.digitalgate.com.au/api/connectors/linkedin/callback
 *
 * Organisation id travels in signed OAuth `state` (not cookies).
 * Callback is a public Clerk route.
 */
export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin;
  const connected = () =>
    NextResponse.redirect(new URL(`${RETURN_PATH}?linkedin=connected`, base));
  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(
        `${RETURN_PATH}?linkedin=error&message=${encodeURIComponent(msg)}`,
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
    return fail("Missing code or state from LinkedIn");
  }

  const parsed = parseLinkedInOAuthState(state);
  if (!parsed.ok) {
    return fail(parsed.message);
  }
  const organisationId = parsed.organisationId;

  const exchanged = await exchangeLinkedInAuthorizationCode({ code });
  if (!exchanged.ok) {
    return fail(exchanged.message);
  }

  try {
    await saveOrgLinkedInConnectorTokens(organisationId, {
      accessToken: exchanged.token.access_token,
      refreshToken: exchanged.token.refresh_token,
      expiresAt: exchanged.token.expiresAt,
      refreshExpiresAt: exchanged.token.refreshExpiresAt,
      scope: exchanged.token.scope,
      connectedAt: new Date().toISOString(),
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to save LinkedIn tokens");
  }

  try {
    await probeOrgLinkedInConnection(organisationId);
  } catch {
    /* identity / ACL probe can be retried from Social → Accounts */
  }

  const { userId } = await auth();
  if (!userId) {
    const after = `${RETURN_PATH}?linkedin=connected`;
    return NextResponse.redirect(
      new URL(`/login?redirect_url=${encodeURIComponent(after)}`, base),
    );
  }

  return connected();
}

import {
  exchangeLinkedInAuthorizationCode,
  probeOrgLinkedInConnection,
  saveOrgLinkedInConnectorTokens,
} from "@dg/platform-core";
import { NextRequest, NextResponse } from "next/server";

import { parseLinkedInOAuthState } from "@/lib/linkedin-oauth-state";
import { tenantWriteEntitlementBlock } from "@/lib/write-entitlement";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/apps/social/accounts";

type LinkedInReturnState = "connected" | "attention";

function returnPath(state: LinkedInReturnState, message?: string) {
  const params = new URLSearchParams({ linkedin: state });
  if (message) params.set("message", message);
  return `${RETURN_PATH}?${params.toString()}`;
}

/**
 * LinkedIn OAuth redirect —
 * https://app.digitalgate.com.au/api/connectors/linkedin/callback
 *
 * Organisation id travels in signed OAuth `state` (not cookies).
 * Callback is deliberately public so LinkedIn can return without a Clerk
 * session/middleware dependency. The signed state binds the callback to the
 * organisation that initiated the connection.
 */
export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin;
  const finish = (state: LinkedInReturnState, message?: string) =>
    NextResponse.redirect(new URL(returnPath(state, message), base));
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
    const description = req.nextUrl.searchParams.get("error_description");
    const errorUri = req.nextUrl.searchParams.get("error_uri");
    const scope = req.nextUrl.searchParams.get("scope");
    const detail = [
      `LinkedIn OAuth error: ${oauthError}`,
      description ? `description: ${description}` : null,
      scope ? `scope: ${scope}` : null,
      errorUri ? `error_uri: ${errorUri}` : null,
    ].filter(Boolean).join(" · ");
    console.warn("[linkedin/oauth]", detail);
    return fail(detail);
  }
  if (!code || !state) {
    return fail("Missing code or state from LinkedIn");
  }

  const parsed = parseLinkedInOAuthState(state);
  if (!parsed.ok) {
    return fail(parsed.message);
  }
  const organisationId = parsed.organisationId;

  const writeBlock = await tenantWriteEntitlementBlock({ organisationId });
  if (writeBlock) return fail(writeBlock.message);

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

  let result: { state: LinkedInReturnState; message?: string } = {
    state: "connected",
  };
  try {
    const probe = await probeOrgLinkedInConnection(organisationId);
    if (!probe.ok) {
      result = { state: "attention", message: probe.message };
    }
  } catch (err) {
    result = {
      state: "attention",
      message:
        err instanceof Error
          ? `LinkedIn connected, but the account check needs attention: ${err.message}`
          : "LinkedIn connected, but the account check needs attention.",
    };
  }

  return finish(result.state, result.message);
}

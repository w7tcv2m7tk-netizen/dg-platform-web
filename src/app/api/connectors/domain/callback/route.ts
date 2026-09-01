import {
  exchangeDomainAuthorizationCode,
  saveOrgDomainConnectorTokens,
} from "@dg/platform-core";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { tenantWriteEntitlementBlock } from "@/lib/write-entitlement";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "dg_domain_oauth_state";
const ORG_COOKIE = "dg_domain_oauth_org";

/**
 * Domain OAuth redirect — registered as:
 * https://app.digitalgate.com.au/api/connectors/domain/callback
 */
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.digitalgate.com.au";
  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(`/dashboard/settings/connectors?domain=error&message=${encodeURIComponent(msg)}`, appUrl),
    );

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL(`/login?redirect_url=${encodeURIComponent(req.url)}`, appUrl));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) {
    return fail(req.nextUrl.searchParams.get("error_description") || oauthError);
  }
  if (!code || !state) {
    return fail("Missing code or state from Domain");
  }

  const jar = await cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  const organisationId = jar.get(ORG_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  jar.delete(ORG_COOKIE);

  if (!expectedState || expectedState !== state) {
    return fail("OAuth state mismatch — try Connect Domain again");
  }
  if (!organisationId) {
    return fail("Missing organisation context — try Connect Domain again");
  }

  const writeBlock = await tenantWriteEntitlementBlock({ organisationId });
  if (writeBlock) return fail(writeBlock.message);

  const exchanged = await exchangeDomainAuthorizationCode({ code });
  if (!exchanged.ok) {
    return fail(exchanged.message);
  }

  try {
    await saveOrgDomainConnectorTokens(organisationId, {
      accessToken: exchanged.token.access_token,
      refreshToken: exchanged.token.refresh_token,
      expiresAt: exchanged.token.expiresAt,
      scope: exchanged.token.scope,
      connectedAt: new Date().toISOString(),
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to save Domain tokens");
  }

  return NextResponse.redirect(
    new URL("/dashboard/settings/connectors?domain=connected", appUrl),
  );
}

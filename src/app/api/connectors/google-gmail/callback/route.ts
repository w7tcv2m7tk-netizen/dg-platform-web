import {
  exchangeGmailAuthorizationCode,
  fetchGmailProfileEmail,
  saveOrgGoogleGmailConnectorTokens,
  syncOrgGmailMailbox,
} from "@dg/platform-core";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { parseGoogleOAuthState } from "@/lib/google-oauth-state";
import { tenantWriteEntitlementBlock } from "@/lib/write-entitlement";

export const dynamic = "force-dynamic";

/**
 * Google Gmail OAuth redirect —
 * https://app.digitalgate.com.au/api/connectors/google-gmail/callback
 */
export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin;
  const mailboxesOk = (extra = "") =>
    NextResponse.redirect(
      new URL(`/apps/communications/mailboxes?gmail=connected${extra}`, base),
    );
  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(
        `/apps/communications/mailboxes?gmail=error&message=${encodeURIComponent(msg)}`,
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

  const exchanged = await exchangeGmailAuthorizationCode({ code });
  if (!exchanged.ok) {
    return fail(exchanged.message);
  }

  let label: string | undefined;
  try {
    label =
      (await fetchGmailProfileEmail(exchanged.token.access_token)) || undefined;
  } catch {
    /* label optional */
  }

  try {
    await saveOrgGoogleGmailConnectorTokens(organisationId, {
      accessToken: exchanged.token.access_token,
      refreshToken: exchanged.token.refresh_token,
      expiresAt: exchanged.token.expiresAt,
      scope: exchanged.token.scope,
      connectedAt: new Date().toISOString(),
      label,
      health: {
        status: "connected",
        lastSyncAt: null,
        lastError: null,
        message: "Connected — run Sync to pull recent mail",
      },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to save Gmail tokens");
  }

  // Phase 2: first sync after connect (best-effort)
  try {
    await syncOrgGmailMailbox(organisationId);
  } catch {
    /* sync can be retried from Mailboxes */
  }

  const { userId } = await auth();
  if (!userId) {
    const after = `/apps/communications/mailboxes?gmail=connected`;
    return NextResponse.redirect(
      new URL(`/login?redirect_url=${encodeURIComponent(after)}`, base),
    );
  }

  return mailboxesOk();
}

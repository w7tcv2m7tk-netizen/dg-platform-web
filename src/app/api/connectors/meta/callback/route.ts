import { discoverMetaIdentity, exchangeMetaCode, saveOrgMetaConnector } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { parseMetaOAuthState } from "@/lib/meta-oauth-state";
import { tenantWriteEntitlementBlock } from "@/lib/write-entitlement";

export const dynamic = "force-dynamic";

function finish(appUrl: string, status: string, message?: string) {
  const url = new URL("/apps/social/accounts", appUrl);
  url.searchParams.set("meta", status);
  if (message) url.searchParams.set("message", message.slice(0, 300));
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || url.origin || "https://app.digitalgate.com.au";
  const state = url.searchParams.get("state") || "";
  const parsed = parseMetaOAuthState(state);
  if (!parsed.ok) return finish(appUrl, "error", parsed.message);

  const denied = url.searchParams.get("error_description") || url.searchParams.get("error_message");
  if (denied) return finish(appUrl, "error", denied);
  const code = url.searchParams.get("code");
  if (!code) return finish(appUrl, "error", "Meta did not return an authorisation code");

  const writeBlock = await tenantWriteEntitlementBlock({ organisationId: parsed.organisationId });
  if (writeBlock) return finish(appUrl, "error", writeBlock.message);

  try {
    const token = await exchangeMetaCode(code);
    const identity = await discoverMetaIdentity(token.accessToken);
    const now = new Date().toISOString();
    await saveOrgMetaConnector(parsed.organisationId, {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      connectedAt: now,
      userId: identity.userId,
      userName: identity.userName,
      pages: identity.pages,
      selectedPageIds: [],
      health: {
        status: identity.pages.length ? "connected" : "degraded",
        lastSyncAt: now,
        message: identity.pages.length ? `${identity.pages.length} Facebook Page${identity.pages.length === 1 ? "" : "s"} available — select the Page(s) for this organisation` : "Meta connected, but no manageable Facebook Pages were returned",
      },
    });
    return finish(appUrl, identity.pages.length ? "connected" : "attention");
  } catch (err) {
    return finish(appUrl, "error", err instanceof Error ? err.message : "Meta connection failed");
  }
}

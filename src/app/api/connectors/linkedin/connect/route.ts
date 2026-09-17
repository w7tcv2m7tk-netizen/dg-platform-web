import {
  buildLinkedInAuthorizeUrl,
  linkedInCredentialsConfigured,
} from "@dg/platform-core";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  tenantWriteEntitlementBlock,
  writeEntitlementResponse,
} from "@/lib/write-entitlement";
import { fetchPortalMe } from "@/lib/dg-api";
import { createLinkedInOAuthState } from "@/lib/linkedin-oauth-state";

export const dynamic = "force-dynamic";

/**
 * Start LinkedIn OAuth.
 *
 * The base connection deliberately requests only LinkedIn's OpenID scopes.
 * Company-page publishing/management scopes are a separately vetted LinkedIn
 * product and must not prevent an organisation from establishing its identity
 * connection while Community Management access is pending.
 *
 * GET /api/connectors/linkedin/connect
 */
export async function GET(req: Request) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    new URL(req.url).origin ||
    "https://app.digitalgate.com.au";
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  if (!linkedInCredentialsConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "linkedin_not_configured",
          message:
            "LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET missing on this deployment",
        },
      },
      { status: 503 },
    );
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;
  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = await resolveActivePlatformSession({
    clerkUserId: userId,
    email,
    name,
    orgName: portal?.org_name,
  });
  if (!session) {
    return NextResponse.json(
      { error: { code: "no_org", message: "No active organisation" } },
      { status: 400 },
    );
  }

  const writeBlock = await tenantWriteEntitlementBlock(session);
  if (writeBlock) return writeEntitlementResponse(writeBlock);

  let state: string;
  try {
    state = createLinkedInOAuthState(session.organisationId);
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "linkedin_state",
          message: err instanceof Error ? err.message : "Could not create OAuth state",
        },
      },
      { status: 503 },
    );
  }

  // Keep the initial OAuth handshake usable even before LinkedIn approves the
  // separately-vetted Community Management product. The post-connect probe
  // will surface company-page capability as degraded until those permissions
  // are available rather than failing the entire connection at authorisation.
  const authUrl = buildLinkedInAuthorizeUrl({
    state,
    scopes: "openid profile email",
  });
  if (!authUrl.ok) {
    return NextResponse.json(
      { error: { code: "linkedin_config", message: authUrl.message } },
      { status: 503 },
    );
  }

  return NextResponse.redirect(authUrl.url);
}

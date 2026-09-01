import {
  buildDomainAuthorizeUrl,
  domainCredentialsConfigured,
} from "@dg/platform-core";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  tenantWriteEntitlementBlock,
  writeEntitlementResponse,
} from "@/lib/write-entitlement";
import { fetchPortalMe } from "@/lib/dg-api";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "dg_domain_oauth_state";
const ORG_COOKIE = "dg_domain_oauth_org";

/**
 * Start Domain Authorization Code flow (agency user context).
 * GET /api/connectors/domain/connect
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "https://app.digitalgate.com.au"));
  }

  if (!domainCredentialsConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "domain_not_configured",
          message: "DOMAIN_CLIENT_ID / DOMAIN_CLIENT_SECRET missing on this deployment",
        },
      },
      { status: 503 },
    );
  }

  const { currentUser } = await import("@clerk/nextjs/server");
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

  const state = randomBytes(24).toString("hex");
  const nonce = randomBytes(24).toString("hex");
  const authUrl = buildDomainAuthorizeUrl({ state, nonce });
  if (!authUrl.ok) {
    return NextResponse.json(
      { error: { code: "domain_config", message: authUrl.message } },
      { status: 503 },
    );
  }

  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 600,
  });
  jar.set(ORG_COOKIE, session.organisationId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(authUrl.url);
}

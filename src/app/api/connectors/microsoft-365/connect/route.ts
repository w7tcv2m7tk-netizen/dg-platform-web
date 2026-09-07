import {
  buildMicrosoftAuthorizeUrl,
  microsoftCredentialsConfigured,
} from "@dg/platform-core";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { requirePermission } from "@/lib/platform-api";
import {
  tenantWriteEntitlementBlock,
  writeEntitlementResponse,
} from "@/lib/write-entitlement";
import { createGoogleOAuthState } from "@/lib/google-oauth-state";

export const dynamic = "force-dynamic";

/**
 * Start Microsoft 365 OAuth (Core Communications mailboxes).
 * GET /api/connectors/microsoft-365/connect
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

  if (!microsoftCredentialsConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "microsoft_not_configured",
          message: "MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET missing on this deployment",
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
  const session = await resolveActivePlatformSession({
    clerkUserId: userId,
    email,
    name,
  });
  if (!session) {
    return NextResponse.json(
      { error: { code: "no_org", message: "No active organisation" } },
      { status: 400 },
    );
  }

  const denied = requirePermission(session, {
    module: "settings",
    action: "manage",
    scope: "organisation",
  });
  if (denied) return denied;

  const writeBlock = await tenantWriteEntitlementBlock(session);
  if (writeBlock) return writeEntitlementResponse(writeBlock);

  let state: string;
  try {
    state = createGoogleOAuthState(session.organisationId);
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "microsoft_state",
          message: err instanceof Error ? err.message : "Could not create OAuth state",
        },
      },
      { status: 503 },
    );
  }

  const authUrl = buildMicrosoftAuthorizeUrl({ state });
  if (!authUrl.ok) {
    return NextResponse.json(
      { error: { code: "microsoft_config", message: authUrl.message } },
      { status: 503 },
    );
  }

  return NextResponse.redirect(authUrl.url);
}

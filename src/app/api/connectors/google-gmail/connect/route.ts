import {
  buildGmailAuthorizeUrl,
  gmailCredentialsConfigured,
} from "@dg/platform-core";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";
import { createGoogleOAuthState } from "@/lib/google-oauth-state";

export const dynamic = "force-dynamic";

/**
 * Start Google Gmail OAuth (Core Communications mailboxes).
 * GET /api/connectors/google-gmail/connect
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

  if (!gmailCredentialsConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "google_not_configured",
          message: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing on this deployment",
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

  let state: string;
  try {
    state = createGoogleOAuthState(session.organisationId);
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "google_state",
          message: err instanceof Error ? err.message : "Could not create OAuth state",
        },
      },
      { status: 503 },
    );
  }

  const authUrl = buildGmailAuthorizeUrl({ state });
  if (!authUrl.ok) {
    return NextResponse.json(
      { error: { code: "google_config", message: authUrl.message } },
      { status: 503 },
    );
  }

  return NextResponse.redirect(authUrl.url);
}

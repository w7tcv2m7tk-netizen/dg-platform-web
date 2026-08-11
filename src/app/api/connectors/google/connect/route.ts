import {
  buildGoogleAuthorizeUrl,
  googleCredentialsConfigured,
} from "@dg/platform-core";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "dg_google_oauth_state";
const ORG_COOKIE = "dg_google_oauth_org";

/**
 * Start Google Business Profile OAuth.
 * GET /api/connectors/google/connect
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.digitalgate.com.au";
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  if (!googleCredentialsConfigured()) {
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

  const state = randomBytes(24).toString("hex");
  const authUrl = buildGoogleAuthorizeUrl({ state });
  if (!authUrl.ok) {
    return NextResponse.json(
      { error: { code: "google_config", message: authUrl.message } },
      { status: 503 },
    );
  }

  const jar = await cookies();
  // Secure whenever we are not on plain localhost — Vercel is always HTTPS.
  const secure =
    process.env.NODE_ENV === "production" ||
    !(process.env.NEXT_PUBLIC_APP_URL || "").includes("localhost");
  const cookieBase = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 1800, // 30m — Google consent can be slow
  };
  jar.set(STATE_COOKIE, state, cookieBase);
  jar.set(ORG_COOKIE, session.organisationId, cookieBase);

  return NextResponse.redirect(authUrl.url);
}

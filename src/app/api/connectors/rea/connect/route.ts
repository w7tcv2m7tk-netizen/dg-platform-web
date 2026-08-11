import {
  bootConnectorEngine,
  buildReaAuthorizeUrl,
  reaCredentialsConfigured,
  reaOAuthEndpointsConfigured,
} from "@dg/platform-core";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

bootConnectorEngine();

/**
 * Start REA Authorization Code flow (when partner OAuth is live).
 * GET /api/connectors/rea/connect
 *
 * Scaffold: always returns JSON 503 — no redirect to a fake authorize URL.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "https://app.digitalgate.com.au"),
    );
  }

  if (!reaCredentialsConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "rea_not_configured",
          message:
            "REA_CLIENT_ID / REA_CLIENT_SECRET missing — partner access required before Connect works",
        },
      },
      { status: 503 },
    );
  }

  if (!reaOAuthEndpointsConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "rea_oauth_endpoints_unknown",
          message:
            "REA OAuth authorize/token URLs not set — add REA_AUTH_AUTHORIZE_URL + REA_AUTH_TOKEN_URL from partner docs",
        },
      },
      { status: 503 },
    );
  }

  const state = randomBytes(24).toString("hex");
  const nonce = randomBytes(24).toString("hex");
  const authUrl = buildReaAuthorizeUrl({ state, nonce });
  if (!authUrl.ok) {
    return NextResponse.json(
      { error: { code: "rea_oauth_not_ready", message: authUrl.message } },
      { status: 503 },
    );
  }

  // Unreachable until buildReaAuthorizeUrl returns a real URL.
  return NextResponse.redirect(authUrl.url);
}

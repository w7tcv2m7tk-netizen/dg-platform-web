import {
  bootConnectorEngine,
  getOrgReaConnectorTokens,
  probeOrgReaConnection,
  probeReaConnection,
  reaCredentialsConfigured,
  reaOAuthEndpointsConfigured,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

bootConnectorEngine();

/** GET /api/v1/connectors/rea/status — platform + org REA connection health (honest scaffold). */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const configured = reaCredentialsConfigured();
  const oauthEndpointsReady = reaOAuthEndpointsConfigured();
  const orgTokens = await getOrgReaConnectorTokens(session.organisationId);
  const connected = Boolean(orgTokens?.accessToken || orgTokens?.refreshToken);

  let platformProbe: Awaited<ReturnType<typeof probeReaConnection>> | null = null;
  if (configured) {
    platformProbe = await probeReaConnection();
  }

  let orgProbe: Awaited<ReturnType<typeof probeOrgReaConnection>> | null = null;
  if (connected) {
    orgProbe = await probeOrgReaConnection(session.organisationId);
  }

  return NextResponse.json({
    data: {
      platform: {
        configured,
        oauthEndpointsReady,
        clientIdSet: Boolean(process.env.REA_CLIENT_ID?.trim()),
        secretSet: Boolean(process.env.REA_CLIENT_SECRET?.trim()),
        redirectUri:
          process.env.REA_REDIRECT_URI?.trim() ||
          "https://app.digitalgate.com.au/api/connectors/rea/callback",
        apiBaseUrl: process.env.REA_API_BASE_URL?.trim() || "",
        authorizeUrlSet: Boolean(process.env.REA_AUTH_AUTHORIZE_URL?.trim()),
        tokenUrlSet: Boolean(process.env.REA_AUTH_TOKEN_URL?.trim()),
        publishImplemented: false,
        probe: platformProbe,
      },
      organisation: {
        id: session.organisationId,
        name: session.organisationName,
        connected,
        expiresAt: orgTokens?.expiresAt ?? null,
        connectedAt: orgTokens?.connectedAt ?? null,
        scope: orgTokens?.scope ?? null,
        reaAgencyId: orgTokens?.reaAgencyId ?? orgProbe?.reaAgencyId ?? null,
        lastError: orgTokens?.lastError ?? null,
        probe: orgProbe,
      },
    },
  });
}

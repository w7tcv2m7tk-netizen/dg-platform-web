import {
  getOrgGoogleGbpConnectorTokens,
  googleCredentialsConfigured,
  probeOrgGoogleGbpConnection,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** GET /api/v1/connectors/google/status */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const configured = googleCredentialsConfigured();
  const orgTokens = await getOrgGoogleGbpConnectorTokens(session.organisationId);
  const connected = Boolean(orgTokens?.accessToken || orgTokens?.refreshToken);

  let orgProbe: Awaited<ReturnType<typeof probeOrgGoogleGbpConnection>> | null = null;
  if (connected) {
    orgProbe = await probeOrgGoogleGbpConnection(session.organisationId);
  }

  return NextResponse.json({
    data: {
      platform: {
        configured,
        clientIdSet: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
        secretSet: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
        redirectUri:
          process.env.GOOGLE_REDIRECT_URI?.trim() ||
          "https://app.digitalgate.com.au/api/connectors/google/callback",
      },
      organisation: {
        id: session.organisationId,
        name: session.organisationName,
        connected,
        expiresAt: orgTokens?.expiresAt ?? null,
        connectedAt: orgTokens?.connectedAt ?? null,
        scope: orgTokens?.scope ?? null,
        probe: orgProbe,
      },
    },
  });
}

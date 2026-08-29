import {
  getMicrosoftOAuthRedirectUri,
  getOrgMicrosoft365ConnectorTokens,
  microsoftCredentialsConfigured,
  probeOrgMicrosoft365Connection,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** GET /api/v1/connectors/microsoft-365/status */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const configured = microsoftCredentialsConfigured();
  const orgTokens = await getOrgMicrosoft365ConnectorTokens(session.organisationId);
  const connected = Boolean(orgTokens?.accessToken || orgTokens?.refreshToken);

  let orgProbe: Awaited<ReturnType<typeof probeOrgMicrosoft365Connection>> | null =
    null;
  if (connected) {
    orgProbe = await probeOrgMicrosoft365Connection(session.organisationId);
  }

  return NextResponse.json({
    data: {
      platform: {
        configured,
        clientIdSet: Boolean(process.env.MICROSOFT_CLIENT_ID?.trim()),
        secretSet: Boolean(process.env.MICROSOFT_CLIENT_SECRET?.trim()),
        redirectUri: getMicrosoftOAuthRedirectUri(),
      },
      organisation: {
        id: session.organisationId,
        name: session.organisationName,
        connected,
        email: orgTokens?.label ?? orgProbe?.email ?? null,
        expiresAt: orgTokens?.expiresAt ?? null,
        connectedAt: orgTokens?.connectedAt ?? null,
        scope: orgTokens?.scope ?? null,
        probe: orgProbe,
        health: orgTokens?.health ?? null,
      },
    },
  });
}

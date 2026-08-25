import {
  getGmailOAuthRedirectUri,
  getOrgGoogleGmailConnectorTokens,
  gmailCredentialsConfigured,
  probeOrgGoogleGmailConnection,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** GET /api/v1/connectors/google-gmail/status */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const configured = gmailCredentialsConfigured();
  const orgTokens = await getOrgGoogleGmailConnectorTokens(session.organisationId);
  const connected = Boolean(orgTokens?.accessToken || orgTokens?.refreshToken);

  let orgProbe: Awaited<ReturnType<typeof probeOrgGoogleGmailConnection>> | null =
    null;
  if (connected) {
    orgProbe = await probeOrgGoogleGmailConnection(session.organisationId);
  }

  return NextResponse.json({
    data: {
      platform: {
        configured,
        clientIdSet: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
        secretSet: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
        redirectUri: getGmailOAuthRedirectUri(),
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

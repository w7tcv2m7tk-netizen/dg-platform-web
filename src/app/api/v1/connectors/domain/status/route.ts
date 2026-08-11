import {
  bootConnectorEngine,
  domainCredentialsConfigured,
  getOrgDomainConnectorTokens,
  probeDomainConnection,
  probeOrgDomainConnection,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

bootConnectorEngine();

/** GET /api/v1/connectors/domain/status — platform + org Domain connection health. */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const configured = domainCredentialsConfigured();
  const orgTokens = await getOrgDomainConnectorTokens(session.organisationId);
  const connected = Boolean(orgTokens?.accessToken || orgTokens?.refreshToken);

  let platformProbe: Awaited<ReturnType<typeof probeDomainConnection>> | null = null;
  if (configured) {
    platformProbe = await probeDomainConnection();
  }

  let orgProbe: Awaited<ReturnType<typeof probeOrgDomainConnection>> | null = null;
  if (connected) {
    orgProbe = await probeOrgDomainConnection(session.organisationId);
  }

  return NextResponse.json({
    data: {
      platform: {
        configured,
        clientIdSet: Boolean(process.env.DOMAIN_CLIENT_ID?.trim()),
        secretSet: Boolean(process.env.DOMAIN_CLIENT_SECRET?.trim()),
        redirectUri:
          process.env.DOMAIN_REDIRECT_URI?.trim() ||
          "https://app.digitalgate.com.au/api/connectors/domain/callback",
        apiPathPrefix: process.env.DOMAIN_API_PATH_PREFIX?.trim() || "",
        probe: platformProbe,
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

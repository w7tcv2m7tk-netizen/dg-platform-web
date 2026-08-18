import {
  getOrgLinkedInConnectorTokens,
  linkedInCredentialsConfigured,
  probeOrgLinkedInConnection,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** GET /api/v1/connectors/linkedin/status */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const configured = linkedInCredentialsConfigured();
  const orgTokens = await getOrgLinkedInConnectorTokens(session.organisationId);
  const connected = Boolean(orgTokens?.accessToken || orgTokens?.refreshToken);

  let orgProbe: Awaited<ReturnType<typeof probeOrgLinkedInConnection>> | null =
    null;
  if (connected) {
    orgProbe = await probeOrgLinkedInConnection(session.organisationId);
  }

  const latest = connected
    ? await getOrgLinkedInConnectorTokens(session.organisationId)
    : orgTokens;

  return NextResponse.json({
    data: {
      platform: {
        configured,
        clientIdSet: Boolean(process.env.LINKEDIN_CLIENT_ID?.trim()),
        secretSet: Boolean(process.env.LINKEDIN_CLIENT_SECRET?.trim()),
        redirectUri:
          process.env.LINKEDIN_REDIRECT_URI?.trim() ||
          "https://app.digitalgate.com.au/api/connectors/linkedin/callback",
      },
      organisation: {
        id: session.organisationId,
        name: session.organisationName,
        connected,
        expiresAt: latest?.expiresAt ?? null,
        connectedAt: latest?.connectedAt ?? null,
        scope: latest?.scope ?? null,
        label: latest?.label ?? null,
        member: latest?.member ?? null,
        organizations: latest?.organizations ?? [],
        selectedOrganizationUrn: latest?.selectedOrganizationUrn ?? null,
        health: latest?.health ?? null,
        lastError: latest?.lastError ?? null,
        probe: orgProbe,
      },
    },
  });
}

import {
  getOrgMicrosoft365ConnectorTokens,
  microsoftCredentialsConfigured,
  probeOrgMicrosoft365Connection,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  requireFeature,
  requirePlatformAuth,
} from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** GET /api/v1/connectors/microsoft-365/status */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "communications.read");
  if (denied) return denied;

  const configured = microsoftCredentialsConfigured();
  const orgTokens = await getOrgMicrosoft365ConnectorTokens(session.organisationId);
  const connected = Boolean(orgTokens?.accessToken || orgTokens?.refreshToken);

  const orgProbe = connected
    ? await probeOrgMicrosoft365Connection(session.organisationId)
    : null;
  const health = orgTokens?.health ?? null;

  return NextResponse.json({
    data: {
      platform: {
        configured,
      },
      organisation: {
        name: session.organisationName,
        connected,
        email: orgTokens?.label ?? orgProbe?.email ?? null,
        connectedAt: orgTokens?.connectedAt ?? null,
        health: health
          ? {
              status: health.status,
              lastSyncAt: health.lastSyncAt ?? null,
              messagesSynced: health.messagesSynced,
              hasIssue: Boolean(health.lastError),
            }
          : null,
      },
    },
  });
}

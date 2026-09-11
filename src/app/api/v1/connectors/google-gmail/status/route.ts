import {
  getOrgGoogleGmailConnectorTokens,
  gmailCredentialsConfigured,
  probeOrgGoogleGmailConnection,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  requireFeature,
  requirePlatformAuth,
} from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** GET /api/v1/connectors/google-gmail/status */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "communications.read");
  if (denied) return denied;

  const configured = gmailCredentialsConfigured();
  const orgTokens = await getOrgGoogleGmailConnectorTokens(session.organisationId);
  const connected = Boolean(orgTokens?.accessToken || orgTokens?.refreshToken);

  const orgProbe = connected
    ? await probeOrgGoogleGmailConnection(session.organisationId)
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

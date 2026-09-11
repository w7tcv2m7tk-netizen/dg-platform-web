import {
  getOrgAppleIcloudConnectorCredentials,
} from "@dg/platform-core/connectors/apple-icloud";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  requireFeature,
  requirePlatformAuth,
} from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET /api/v1/connectors/apple-icloud/status */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "communications.read");
  if (denied) return denied;

  const creds = await getOrgAppleIcloudConnectorCredentials(session.organisationId);
  const connected = Boolean(creds?.email && creds.appPassword);
  const health = creds?.health ?? null;

  return NextResponse.json({
    data: {
      organisation: {
        name: session.organisationName,
        connected,
        email: creds?.label ?? creds?.email ?? null,
        connectedAt: creds?.connectedAt ?? null,
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

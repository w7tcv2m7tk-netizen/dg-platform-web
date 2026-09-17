import {
  getOrgMetaConnectorTokens,
  metaCredentialsConfigured,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const tokens = await getOrgMetaConnectorTokens(session.organisationId);
  const connected = Boolean(tokens?.accessToken);

  return NextResponse.json({
    data: {
      platform: {
        configured: metaCredentialsConfigured(),
        appIdSet: Boolean(process.env.META_APP_ID?.trim()),
        secretSet: Boolean(process.env.META_APP_SECRET?.trim()),
        redirectUri:
          process.env.META_REDIRECT_URI?.trim() ||
          "https://app.digitalgate.com.au/api/connectors/meta/callback",
      },
      organisation: {
        id: session.organisationId,
        name: session.organisationName,
        connected,
        expiresAt: tokens?.expiresAt ?? null,
        connectedAt: tokens?.connectedAt ?? null,
        label: tokens?.label ?? null,
        pages: tokens?.pages ?? [],
        selectedPageIds: tokens?.selectedPageIds ?? [],
        health: tokens?.health ?? null,
        lastError: tokens?.lastError ?? null,
        probe: tokens?.health
          ? {
              ok: tokens.health.status === "connected",
              message:
                tokens.health.message ||
                (tokens.health.status === "connected"
                  ? "Meta connected"
                  : "Meta connection needs attention"),
            }
          : null,
      },
    },
  });
}

import {
  getOrgAppleIcloudConnectorCredentials,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET /api/v1/connectors/apple-icloud/status */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const creds = await getOrgAppleIcloudConnectorCredentials(session.organisationId);
  const connected = Boolean(creds?.email && creds.appPassword);

  let orgProbe: {
    ok: boolean;
    connected: boolean;
    apiOk?: boolean;
    email?: string | null;
    message: string;
  } | null = null;
  // Skip live IMAP probe on every status load — expensive on serverless.
  if (connected) {
    orgProbe = {
      ok: true,
      connected: true,
      apiOk: true,
      email: creds?.email ?? null,
      message: `iCloud connected · ${creds?.email}`,
    };
  }

  return NextResponse.json({
    data: {
      platform: {
        configured: true,
        auth: "app_specific_password",
        imapHost: "imap.mail.me.com",
      },
      organisation: {
        id: session.organisationId,
        name: session.organisationName,
        connected,
        email: creds?.label ?? creds?.email ?? null,
        connectedAt: creds?.connectedAt ?? null,
        probe: orgProbe,
        health: creds?.health ?? null,
      },
    },
  });
}

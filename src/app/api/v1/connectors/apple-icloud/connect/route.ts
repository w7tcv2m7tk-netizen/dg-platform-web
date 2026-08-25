import {
  connectOrgAppleIcloudMailbox,
  syncOrgAppleIcloudMailbox,
} from "@dg/platform-core/connectors/apple-icloud";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  requirePermission,
  requirePlatformAuth,
} from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/v1/connectors/apple-icloud/connect — email + app-specific password */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requirePermission(session, {
    module: "settings",
    action: "manage",
    scope: "organisation",
  });
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    appPassword?: string;
  };
  const email = typeof body.email === "string" ? body.email : "";
  const appPassword = typeof body.appPassword === "string" ? body.appPassword : "";

  const connected = await connectOrgAppleIcloudMailbox({
    organisationId: session.organisationId,
    email,
    appPassword,
  });
  if (!connected.ok) {
    return NextResponse.json(
      { error: { code: "icloud_connect_failed", message: connected.message } },
      { status: 400 },
    );
  }

  // Best-effort first sync
  try {
    await syncOrgAppleIcloudMailbox(session.organisationId);
  } catch {
    /* retry from Mailboxes */
  }

  return NextResponse.json({
    data: { connected: true, email: connected.email },
  });
}

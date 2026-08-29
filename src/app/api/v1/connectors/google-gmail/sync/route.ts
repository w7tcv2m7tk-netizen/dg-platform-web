import { syncOrgGmailMailbox } from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  requirePermission,
  requirePlatformAuth,
} from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** POST /api/v1/connectors/google-gmail/sync */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requirePermission(session, {
    module: "settings",
    action: "manage",
    scope: "organisation",
  });
  if (denied) return denied;

  const result = await syncOrgGmailMailbox(session.organisationId);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          code: "gmail_sync_failed",
          message: result.message,
        },
        data: result,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ data: result });
}

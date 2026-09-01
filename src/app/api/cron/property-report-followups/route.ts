import { processDueFollowupEmails } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/lib/cron-auth";

/**
 * Back-compat alias — prefer /api/cron/lead-followups.
 */

export async function GET(req: Request) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.message } },
      { status: auth.code === "cron_not_configured" ? 503 : 401 },
    );
  }
  const result = await processDueFollowupEmails({ limit: 50 });
  return NextResponse.json({ data: result });
}

export async function POST(req: Request) {
  return GET(req);
}

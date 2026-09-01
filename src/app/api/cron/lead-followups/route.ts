import { processDueFollowupEmails } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/lib/cron-auth";


/**
 * Hourly cron — property-report, free-audit, hideaway-circle, and
 * Platform Consultation reminder emails when due.
 * Secure with CRON_SECRET (Authorization: Bearer …).
 */
export async function GET(req: Request) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.message } },
      { status: auth.code === "cron_not_configured" ? 503 : 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        error: {
          code: "database_not_configured",
          message: "DATABASE_URL not set",
        },
      },
      { status: 503 },
    );
  }

  const result = await processDueFollowupEmails({ limit: 50 });
  return NextResponse.json({ data: result });
}

export async function POST(req: Request) {
  return GET(req);
}

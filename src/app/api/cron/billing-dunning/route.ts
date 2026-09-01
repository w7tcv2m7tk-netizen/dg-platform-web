import {
  advanceDunningForSubscription,
  listSubscriptionsNeedingDunning,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/lib/cron-auth";


/**
 * Daily dunning ladder — PAYMENT_FAILED → PAST_DUE → RESTRICTED → SUSPENDED.
 * Sets reminder flags for email follow-up (sends not in this foundation pass).
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

  const rows = await listSubscriptionsNeedingDunning(500);
  let advanced = 0;
  for (const row of rows) {
    const before = row.status;
    const next = await advanceDunningForSubscription(row);
    if (next && next.status !== before) advanced += 1;
  }

  return NextResponse.json({
    ok: true,
    scanned: rows.length,
    advanced,
  });
}

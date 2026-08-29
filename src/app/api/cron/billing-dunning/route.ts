import {
  advanceDunningForSubscription,
  listSubscriptionsNeedingDunning,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization")?.trim() || "";
  const headerSecret = req.headers.get("x-cron-secret")?.trim() || "";
  const isVercelCron = Boolean(req.headers.get("x-vercel-cron"));

  if (secret) {
    if (auth === `Bearer ${secret}`) return true;
    if (headerSecret === secret) return true;
    return false;
  }

  return isVercelCron;
}

/**
 * Daily dunning ladder — PAYMENT_FAILED → PAST_DUE → RESTRICTED → SUSPENDED.
 * Sets reminder flags for email follow-up (sends not in this foundation pass).
 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid cron secret" } },
      { status: 401 },
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

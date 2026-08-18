import { processDueFollowupEmails } from "@dg/platform-core";
import { NextResponse } from "next/server";

/**
 * Back-compat alias — prefer /api/cron/lead-followups.
 */
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

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid cron secret" } },
      { status: 401 },
    );
  }
  const result = await processDueFollowupEmails({ limit: 50 });
  return NextResponse.json({ data: result });
}

export async function POST(req: Request) {
  return GET(req);
}

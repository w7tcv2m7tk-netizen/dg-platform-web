import { deliverAiAccountingOutbox, processAiLocalRetention } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";

export async function GET(req: Request) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: { code: auth.code } }, { status: auth.code === "cron_not_configured" ? 503 : 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: { code: "database_not_configured" } }, { status: 503 });
  const accounting = await deliverAiAccountingOutbox(50);
  const retention = await processAiLocalRetention();
  return NextResponse.json({ data: { accounting, retention } });
}

export async function POST(req: Request) { return GET(req); }

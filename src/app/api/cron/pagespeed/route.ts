import { refreshPublishedSitesPagespeed } from "@dg/platform-core";
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

export const maxDuration = 60;

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
          message: "Database is not connected",
        },
      },
      { status: 503 },
    );
  }

  const result = await refreshPublishedSitesPagespeed(6);
  return NextResponse.json({ data: result });
}

export async function POST(req: Request) {
  return GET(req);
}

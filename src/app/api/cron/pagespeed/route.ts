import { refreshPublishedSitesPagespeed } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/lib/cron-auth";


export const maxDuration = 60;

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

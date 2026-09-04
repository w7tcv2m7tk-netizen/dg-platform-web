import { getOperatorPlatformAlertsBadgeCount } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

/** Lightweight badge count for Command Centre sidebar (actionable Platform Alerts). */
export async function GET(req: Request) {
  const auth = await requirePlatformOperator(req, "command.view");
  if (isNextResponse(auth)) return auth;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ alertCount: 0 });
  }

  const data = await getOperatorPlatformAlertsBadgeCount(auth.operator);
  return NextResponse.json({
    alertCount: data.alertCount,
    generatedAt: data.generatedAt,
  });
}

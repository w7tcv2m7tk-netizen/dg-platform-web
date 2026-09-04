import { getOperatorGrowthReports, type GrowthReportPeriod } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

const PERIODS = new Set<GrowthReportPeriod>(["mtd", "last_30d", "last_7d"]);

export async function GET(req: Request) {
  const auth = await requirePlatformOperator(req, "command.clients.read");
  if (isNextResponse(auth)) return auth;

  const url = new URL(req.url);
  const periodRaw = url.searchParams.get("period") ?? "mtd";
  const period = PERIODS.has(periodRaw as GrowthReportPeriod)
    ? (periodRaw as GrowthReportPeriod)
    : "mtd";
  const organisationId = url.searchParams.get("organisationId") ?? undefined;

  const data = await getOperatorGrowthReports(auth.operator, { period, organisationId });
  return NextResponse.json({ data });
}

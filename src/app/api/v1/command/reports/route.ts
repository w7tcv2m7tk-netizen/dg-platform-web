import { getGrowthReports, type GrowthReportPeriod } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requireCommandCentre } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

const PERIODS = new Set<GrowthReportPeriod>(["mtd", "last_30d", "last_7d"]);

export async function GET(req: Request) {
  const session = await requireCommandCentre(req, "command.clients.read");
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const periodRaw = url.searchParams.get("period") ?? "mtd";
  const period = PERIODS.has(periodRaw as GrowthReportPeriod)
    ? (periodRaw as GrowthReportPeriod)
    : "mtd";
  const organisationId = url.searchParams.get("organisationId") ?? undefined;

  const data = await getGrowthReports({ period, organisationId });
  return NextResponse.json({ data });
}

import {
  getBalanceSheetReport,
  getCashFlowReport,
  getGstReport,
  getProfitAndLossReport,
  parseReportRange,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "profit_and_loss";
  const range = parseReportRange(
    url.searchParams.get("from"),
    url.searchParams.get("to"),
  );

  if (kind === "profit_and_loss") {
    const data = await getProfitAndLossReport(session.organisationId, range);
    return NextResponse.json({ data });
  }
  if (kind === "gst") {
    const data = await getGstReport(session.organisationId, range);
    return NextResponse.json({ data });
  }
  if (kind === "cash_flow") {
    const data = await getCashFlowReport(session.organisationId, range);
    return NextResponse.json({ data });
  }
  if (kind === "balance_sheet") {
    const asOf = url.searchParams.get("to")
      ? new Date(url.searchParams.get("to")!)
      : new Date();
    const data = await getBalanceSheetReport(session.organisationId, asOf);
    return NextResponse.json({ data });
  }

  return NextResponse.json(
    {
      error: {
        code: "validation_error",
        message: "kind must be profit_and_loss, gst, balance_sheet, or cash_flow",
      },
    },
    { status: 422 },
  );
}

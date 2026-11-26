import { NextResponse } from "next/server";

import { buildOpportunityReportPdf } from "@/lib/opportunity-report-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48,128}$/i.test(token)) {
    return NextResponse.json({ error: { code: "not_found", message: "Report not found" } }, { status: 404 });
  }
  const pdf = await buildOpportunityReportPdf(token).catch((error) => {
    console.error("[opportunity-report-pdf]", error);
    return null;
  });
  if (!pdf) return NextResponse.json({ error: { code: "not_found", message: "Report not found" } }, { status: 404 });
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="digitalgate-digital-opportunity-report.pdf"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

import { completePastClientWorkflow } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const vendorLeadId = body.vendorLeadId as string | undefined;

  if (!vendorLeadId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "vendorLeadId required" } },
      { status: 422 },
    );
  }

  const result = await completePastClientWorkflow(
    session.organisationId,
    vendorLeadId,
    session.clerkUserId,
  );

  if (!result) {
    return NextResponse.json(
      { error: { code: "lead_not_found", message: "Vendor lead not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: result });
}

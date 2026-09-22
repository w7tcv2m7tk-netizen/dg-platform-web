import {
  assertEntitlement, sendQuote } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const outboundGate = await assertEntitlement(session.organisationId, "outbound");
  if (!outboundGate.ok) {
    return NextResponse.json(
      { error: { code: outboundGate.code, message: outboundGate.message } },
      { status: 403 },
    );
  }
  const denied = requireFeature(session, "commerce.manage");
  if (denied) return denied;

  const { id } = await params;
  const quote = await sendQuote(
    session.organisationId,
    id,
    session.clerkUserId,
  );

  if (!quote) {
    return NextResponse.json(
      { error: { code: "quote_not_found", message: "Quote not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: quote });
}

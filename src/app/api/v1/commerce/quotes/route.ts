import { createQuote, listQuotes } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function GET() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const quotes = await listQuotes(session.organisationId);
  return NextResponse.json({ data: quotes });
}

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const lineItems = Array.isArray(body?.lineItems) ? body.lineItems : [];

  if (!lineItems.length) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "lineItems required" } },
      { status: 422 },
    );
  }

  const quote = await createQuote({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    contactId: body?.contactId,
    sourceApp: body?.sourceApp ?? "commerce",
    sourceEntity: body?.sourceEntity,
    lineItems,
    currency: body?.currency,
    validUntil: body?.validUntil ? new Date(body.validUntil) : undefined,
    notes: body?.notes,
    metadata: body?.metadata,
  });

  return NextResponse.json({ data: quote }, { status: 201 });
}

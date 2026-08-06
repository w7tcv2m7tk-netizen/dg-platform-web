import {
  createPaymentRequest,
  listPaymentRequestsForEntity,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const lineItems = body?.lineItems;
  const preset = body?.preset as string | undefined;

  let items = Array.isArray(lineItems) ? lineItems : [];
  if (!items.length && preset === "marketing_contribution") {
    items = [
      {
        description: "Marketing contribution",
        quantity: 1,
        unitAmountCents: body?.amountCents ?? 250000,
        taxCode: "GST",
      },
    ];
  }

  if (!items.length) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "lineItems or preset required" } },
      { status: 422 },
    );
  }

  try {
    const result = await createPaymentRequest({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      sourceApp: body?.sourceApp ?? "real-estate",
      sourceEntity: body?.sourceEntity,
      contactId: body?.contactId,
      quoteId: body?.quoteId,
      invoiceId: body?.invoiceId,
      lineItems: items,
      currency: body?.currency,
      description: body?.description,
      allowedMethods: body?.allowedMethods,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment request failed";
    return NextResponse.json(
      { error: { code: "payment_error", message } },
      { status: 502 },
    );
  }
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") ?? undefined;
  const entityId = searchParams.get("entityId") ?? undefined;

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "entityType and entityId required" } },
      { status: 422 },
    );
  }

  const items = await listPaymentRequestsForEntity(
    session.organisationId,
    entityType,
    entityId,
  );

  return NextResponse.json({ data: items });
}

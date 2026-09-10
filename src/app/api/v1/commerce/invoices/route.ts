import {
  createInvoice,
  isLinkedCommerceRecordNotFoundError,
  listInvoices,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "commerce.read");
  if (denied) return denied;

  const invoices = await listInvoices(session.organisationId);
  return NextResponse.json({ data: invoices });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "commerce.manage");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const lineItems = Array.isArray(body?.lineItems) ? body.lineItems : [];

  if (!lineItems.length) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "lineItems required" } },
      { status: 422 },
    );
  }

  try {
    const invoice = await createInvoice({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      contactId: body?.contactId,
      quoteId: body?.quoteId,
      sourceApp: body?.sourceApp ?? "commerce",
      sourceEntity: body?.sourceEntity,
      lineItems,
      currency: body?.currency,
      dueAt: body?.dueAt ? new Date(body.dueAt) : undefined,
      notes: body?.notes,
      taxInclusive:
        typeof body?.taxInclusive === "boolean" ? body.taxInclusive : undefined,
      buyer: body?.buyer,
      metadata: body?.metadata,
    });

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    if (isLinkedCommerceRecordNotFoundError(error)) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: 422 },
      );
    }
    throw error;
  }
}

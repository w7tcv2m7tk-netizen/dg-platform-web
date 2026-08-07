import {
  getInvoice,
  markInvoicePaid,
  voidInvoice,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const invoice = await getInvoice(session.organisationId, id);
  if (!invoice) {
    return NextResponse.json(
      { error: { code: "invoice_not_found", message: "Invoice not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: invoice });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action as string | undefined;

  if (action === "mark_paid") {
    const invoice = await markInvoicePaid(
      session.organisationId,
      id,
      session.clerkUserId,
    );
    if (!invoice) {
      return NextResponse.json(
        { error: { code: "invoice_not_found", message: "Invoice not found or cannot be paid" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: invoice });
  }

  if (action === "void") {
    const invoice = await voidInvoice(
      session.organisationId,
      id,
      session.clerkUserId,
    );
    if (!invoice) {
      return NextResponse.json(
        { error: { code: "invoice_not_found", message: "Invoice not found or cannot be voided" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: invoice });
  }

  return NextResponse.json(
    { error: { code: "validation_error", message: "action must be mark_paid or void" } },
    { status: 422 },
  );
}

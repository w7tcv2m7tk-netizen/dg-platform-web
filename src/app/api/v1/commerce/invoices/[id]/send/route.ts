import { sendInvoice } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const invoice = await sendInvoice(
    session.organisationId,
    id,
    session.clerkUserId,
  );

  if (!invoice) {
    return NextResponse.json(
      { error: { code: "invoice_not_found", message: "Invoice not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: invoice });
}

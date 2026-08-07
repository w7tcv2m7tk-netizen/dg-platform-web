import {
  declineQuote,
  getQuote,
  sendQuote,
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
  const quote = await getQuote(session.organisationId, id);
  if (!quote) {
    return NextResponse.json(
      { error: { code: "quote_not_found", message: "Quote not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: quote });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action as string | undefined;

  if (action === "decline") {
    const quote = await declineQuote(
      session.organisationId,
      id,
      session.clerkUserId,
    );
    if (!quote) {
      return NextResponse.json(
        { error: { code: "quote_not_found", message: "Quote not found or cannot be declined" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: quote });
  }

  if (action === "send") {
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

  return NextResponse.json(
    { error: { code: "validation_error", message: "action must be decline or send" } },
    { status: 422 },
  );
}

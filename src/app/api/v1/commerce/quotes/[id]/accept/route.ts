import { acceptQuote } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const result = await acceptQuote(
    session.organisationId,
    id,
    session.clerkUserId,
  );

  if (!result) {
    return NextResponse.json(
      { error: { code: "quote_not_found", message: "Quote not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: result });
}

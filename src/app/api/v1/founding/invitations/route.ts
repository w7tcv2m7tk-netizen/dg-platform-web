import { NextResponse } from "next/server";
import {
  createFoundingInvitation,
  FOUNDING_SOURCES,
  type FoundingSource,
} from "@dg/platform-core";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

function isSource(value: string | undefined): value is FoundingSource {
  return Boolean(value && (FOUNDING_SOURCES as readonly string[]).includes(value));
}

export async function POST(req: Request) {
  const auth = await requirePlatformOperator(req);
  if (isNextResponse(auth)) return auth;
  const session = auth.session;

  const body = (await req.json().catch(() => null)) as {
    contactId?: string;
    opportunityId?: string;
    name?: string;
    email?: string;
    phone?: string;
    businessName?: string;
    source?: string;
    send?: boolean;
  } | null;

  const result = await createFoundingInvitation({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    actorName: session.name,
    contactId: body?.contactId,
    opportunityId: body?.opportunityId,
    name: body?.name,
    email: body?.email,
    phone: body?.phone,
    businessName: body?.businessName,
    source: isSource(body?.source) ? body.source : undefined,
    send: Boolean(body?.send),
  });

  if (result.error && !result.opportunityId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: result.error } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: result }, { status: 201 });
}

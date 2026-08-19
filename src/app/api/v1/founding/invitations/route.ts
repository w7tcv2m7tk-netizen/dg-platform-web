import { NextResponse } from "next/server";
import {
  canAccessCommandCentre,
  createFoundingInvitation,
  FOUNDING_SOURCES,
  type FoundingSource,
} from "@dg/platform-core";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

function isSource(value: string | undefined): value is FoundingSource {
  return Boolean(value && (FOUNDING_SOURCES as readonly string[]).includes(value));
}

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const allowed = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Founding invitations are staff-only." } },
      { status: 403 },
    );
  }

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

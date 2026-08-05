import { createContact, listContacts } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const limit = searchParams.get("limit")
    ? Number.parseInt(searchParams.get("limit")!, 10)
    : undefined;
  const offset = searchParams.get("offset")
    ? Number.parseInt(searchParams.get("offset")!, 10)
    : undefined;

  const result = await listContacts({
    organisationId: session.organisationId,
    search,
    limit,
    offset,
  });

  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.firstName !== "string" || !body.firstName.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "firstName is required",
        },
      },
      { status: 422 },
    );
  }

  const contact = await createContact({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone,
    source: body.source,
    tags: body.tags,
    companyId: body.companyId,
  });

  return NextResponse.json({ data: contact }, { status: 201 });
}

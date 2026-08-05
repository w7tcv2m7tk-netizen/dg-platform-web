import { getContact, listContactActivities, updateContact } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const contact = await getContact(session.organisationId, id);

  if (!contact) {
    return NextResponse.json(
      { error: { code: "contact_not_found", message: "Contact not found" } },
      { status: 404 },
    );
  }

  const activities = await listContactActivities(session.organisationId, id);

  return NextResponse.json({ data: { contact, activities } });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Invalid body" } },
      { status: 422 },
    );
  }

  if (body.firstName !== undefined && !String(body.firstName).trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "firstName cannot be empty" } },
      { status: 422 },
    );
  }

  const updated = await updateContact({
    organisationId: session.organisationId,
    contactId: id,
    actorId: session.clerkUserId,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone,
    source: body.source,
    tags: body.tags,
    status: body.status,
  });

  if (!updated) {
    return NextResponse.json(
      { error: { code: "contact_not_found", message: "Contact not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: updated });
}
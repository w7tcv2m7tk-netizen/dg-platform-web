import { getContact, listContactActivities } from "@dg/platform-core";
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

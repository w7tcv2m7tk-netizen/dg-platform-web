import { createActivity, getContact } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const entityType = body?.entityType as string | undefined;
  const entityId = body?.entityId as string | undefined;
  const title = body?.title as string | undefined;
  const noteBody = body?.body as string | undefined;

  if (!entityType || !entityId || !title?.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "entityType, entityId, and title are required",
        },
      },
      { status: 422 },
    );
  }

  if (entityType === "Contact") {
    const contact = await getContact(session.organisationId, entityId);
    if (!contact) {
      return NextResponse.json(
        { error: { code: "contact_not_found", message: "Contact not found" } },
        { status: 404 },
      );
    }
  }

  const activity = await createActivity({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    entityType,
    entityId,
    activityType: body?.activityType ?? "note",
    title: title.trim(),
    body: noteBody?.trim(),
    sourceApp: body?.sourceApp ?? "crm",
  });

  return NextResponse.json({ data: activity }, { status: 201 });
}

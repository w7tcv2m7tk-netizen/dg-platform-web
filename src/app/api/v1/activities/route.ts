import {
  createActivity,
  getContact,
  getServiceJob,
  listOrganisationActivities,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const feature =
    entityType === "ServiceJob" ? "services.jobs.read" : "crm.timeline.read";
  const denied = requireFeature(session, feature);
  if (denied) return denied;

  const result = await listOrganisationActivities({
    organisationId: session.organisationId,
    entityType: entityType ?? undefined,
    entityId: searchParams.get("entityId") ?? undefined,
    sourceApp: searchParams.get("sourceApp") ?? undefined,
    limit: searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!, 10)
      : undefined,
    offset: searchParams.get("offset")
      ? Number.parseInt(searchParams.get("offset")!, 10)
      : undefined,
  });

  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
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

  const feature =
    entityType === "ServiceJob" ? "services.jobs.write" : "crm.contacts.write";
  const denied = requireFeature(session, feature);
  if (denied) return denied;

  if (entityType === "Contact") {
    const contact = await getContact(session.organisationId, entityId);
    if (!contact) {
      return NextResponse.json(
        { error: { code: "contact_not_found", message: "Contact not found" } },
        { status: 404 },
      );
    }
  }

  if (entityType === "ServiceJob") {
    const job = await getServiceJob(session.organisationId, entityId);
    if (!job) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Job not found" } },
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
    sourceApp: body?.sourceApp ?? (entityType === "ServiceJob" ? "services" : "crm"),
  });

  return NextResponse.json({ data: activity }, { status: 201 });
}

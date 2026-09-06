import {
  createActivity,
  getCompany,
  getContact,
  getOpportunity,
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

  if (entityType === "Contact") {
    const denied = requireFeature(session, "crm.contacts.write");
    if (denied) return denied;
    const contact = await getContact(session.organisationId, entityId);
    if (!contact) {
      return NextResponse.json(
        { error: { code: "contact_not_found", message: "Contact not found" } },
        { status: 404 },
      );
    }
  } else if (entityType === "Company") {
    const denied = requireFeature(session, "crm.companies.write");
    if (denied) return denied;
    const company = await getCompany(session.organisationId, entityId);
    if (!company) {
      return NextResponse.json(
        { error: { code: "company_not_found", message: "Company not found" } },
        { status: 404 },
      );
    }
  } else if (entityType === "Opportunity") {
    const denied = requireFeature(session, "crm.opportunities.write");
    if (denied) return denied;
    const opportunity = await getOpportunity(session.organisationId, entityId);
    if (!opportunity) {
      return NextResponse.json(
        { error: { code: "opportunity_not_found", message: "Opportunity not found" } },
        { status: 404 },
      );
    }
  } else if (entityType === "ServiceJob") {
    const denied = requireFeature(session, "services.jobs.write");
    if (denied) return denied;
    const job = await getServiceJob(session.organisationId, entityId);
    if (!job) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Job not found" } },
        { status: 404 },
      );
    }
  } else {
    return NextResponse.json(
      {
        error: {
          code: "unsupported_entity_type",
          message: "Activity writes are not supported for this entity type",
        },
      },
      { status: 422 },
    );
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

import {
  createServiceJob,
  listServiceJobs,
  isServiceTemplateKey,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "services.jobs.read");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const assignee = searchParams.get("assignedUserId");
  const unassigned = searchParams.get("unassigned");
  const sort = searchParams.get("sort");
  const result = await listServiceJobs({
    organisationId: session.organisationId,
    status: searchParams.get("status") ?? undefined,
    stage: searchParams.get("stage") ?? undefined,
    contactId: searchParams.get("contactId") ?? undefined,
    assignedUserId: assignee && assignee !== "unassigned" ? assignee : undefined,
    unassigned: unassigned === "1" || unassigned === "true" || assignee === "unassigned",
    q: searchParams.get("q") ?? undefined,
    scheduledFrom: searchParams.get("scheduledFrom") ?? undefined,
    scheduledTo: searchParams.get("scheduledTo") ?? undefined,
    sort: sort === "scheduled" || sort === "updated" ? sort : undefined,
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
  const denied = requireFeature(session, "services.jobs.write");
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "title is required" } },
      { status: 422 },
    );
  }

  const templateKey =
    typeof body.templateKey === "string" && isServiceTemplateKey(body.templateKey)
      ? body.templateKey
      : undefined;

  const job = await createServiceJob({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    title: body.title,
    stage: typeof body.stage === "string" ? body.stage : undefined,
    jobType: typeof body.jobType === "string" ? body.jobType : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
    contactId: typeof body.contactId === "string" ? body.contactId : undefined,
    leadId: typeof body.leadId === "string" ? body.leadId : undefined,
    siteAddress: typeof body.siteAddress === "string" ? body.siteAddress : undefined,
    scheduledStartAt:
      typeof body.scheduledStartAt === "string" ? body.scheduledStartAt : undefined,
    scheduledEndAt:
      typeof body.scheduledEndAt === "string" ? body.scheduledEndAt : undefined,
    assignedUserId:
      typeof body.assignedUserId === "string" ? body.assignedUserId : undefined,
    templateKey,
    metadata:
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as Record<string, unknown>)
        : undefined,
  });

  return NextResponse.json({ data: job }, { status: 201 });
}

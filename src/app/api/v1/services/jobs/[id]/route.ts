import { getServiceJob, updateServiceJob } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requireIndustryAppBeta, requirePlatformAuth } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  {
    const betaDenied = await requireIndustryAppBeta(session, "services");
    if (betaDenied) return betaDenied;
  }
  const denied = requireFeature(session, "services.jobs.read");
  if (denied) return denied;

  const { id } = await ctx.params;
  const job = await getServiceJob(session.organisationId, id);
  if (!job) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Job not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: job });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  {
    const betaDenied = await requireIndustryAppBeta(session, "services");
    if (betaDenied) return betaDenied;
  }
  const denied = requireFeature(session, "services.jobs.write");
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  const job = await updateServiceJob({
    organisationId: session.organisationId,
    jobId: id,
    actorId: session.clerkUserId,
    title: typeof body.title === "string" ? body.title : undefined,
    stage: typeof body.stage === "string" ? body.stage : undefined,
    status:
      body.status === "open" ||
      body.status === "won" ||
      body.status === "lost" ||
      body.status === "cancelled"
        ? body.status
        : undefined,
    jobType: typeof body.jobType === "string" ? body.jobType : body.jobType === null ? null : undefined,
    description:
      typeof body.description === "string"
        ? body.description
        : body.description === null
          ? null
          : undefined,
    contactId:
      typeof body.contactId === "string"
        ? body.contactId
        : body.contactId === null
          ? null
          : undefined,
    siteAddress:
      typeof body.siteAddress === "string"
        ? body.siteAddress
        : body.siteAddress === null
          ? null
          : undefined,
    scheduledStartAt:
      typeof body.scheduledStartAt === "string"
        ? body.scheduledStartAt
        : body.scheduledStartAt === null
          ? null
          : undefined,
    scheduledEndAt:
      typeof body.scheduledEndAt === "string"
        ? body.scheduledEndAt
        : body.scheduledEndAt === null
          ? null
          : undefined,
    assignedUserId:
      typeof body.assignedUserId === "string"
        ? body.assignedUserId
        : body.assignedUserId === null
          ? null
          : undefined,
    quoteId: typeof body.quoteId === "string" ? body.quoteId : undefined,
    metadata:
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as Record<string, unknown>)
        : undefined,
  });

  if (!job) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Job not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: job });
}

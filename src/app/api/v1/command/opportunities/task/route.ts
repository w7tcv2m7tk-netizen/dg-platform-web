import { canAccessCommandCentre, createTask } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

/** Create a CRM task on the opportunity's organisation (Command staff). */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.opportunities.read");
  if (denied) return denied;

  const allowed = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
    principalId: session.clerkUserId,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Command Centre is internal only" } },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const organisationId =
    typeof body?.organisationId === "string" ? body.organisationId.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!organisationId || !title) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "organisationId and title required",
        },
      },
      { status: 422 },
    );
  }

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 1);

  const task = await createTask({
    organisationId,
    actorId: session.clerkUserId,
    title,
    description:
      typeof body?.description === "string" ? body.description : undefined,
    dueAt,
    priority: "high",
    sourceApp: "command-centre",
    entityType: typeof body?.entityType === "string" ? body.entityType : undefined,
    entityId: typeof body?.entityId === "string" ? body.entityId : undefined,
    metadata: {
      opportunityId: typeof body?.opportunityId === "string" ? body.opportunityId : undefined,
      from: "opportunity_engine",
    },
    createRelatedActivity: false,
  });

  return NextResponse.json({ data: task }, { status: 201 });
}

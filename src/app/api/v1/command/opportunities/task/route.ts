import { createTask } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

/** Create a CRM task on the opportunity's organisation (platform operator only). */
export async function POST(req: Request) {
  // This route mutates a tenant task cross-organisation, so do not authorise it
  // with the read-only opportunities feature. The neutral Command operator gate
  // proves existing command.view access and mints the branded operator capability.
  const auth = await requirePlatformOperator(req);
  if (isNextResponse(auth)) return auth;

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
    actorId: auth.operator.actorId,
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

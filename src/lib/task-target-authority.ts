import { resolveTaskLinkTarget } from "@dg/platform-core";
import type { PlatformSession } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requireFeature } from "@/lib/platform-api";

/**
 * Same target permission + tenant lookup as POST/PATCH /api/v1/tasks.
 * Session-bound — do not move into Platform Core.
 */
export async function validateTaskTarget(options: {
  session: PlatformSession;
  entityType: string;
  entityId: string;
  requireTargetWrite?: boolean;
}) {
  const { session, entityType, entityId, requireTargetWrite = false } = options;

  if (entityType === "Contact") {
    const denied = requireFeature(
      session,
      requireTargetWrite ? "crm.contacts.write" : "crm.contacts.read",
    );
    if (denied) return denied;
  } else if (entityType === "Company") {
    const denied = requireFeature(
      session,
      requireTargetWrite ? "crm.companies.write" : "crm.companies.read",
    );
    if (denied) return denied;
  } else if (entityType === "Opportunity") {
    const denied = requireFeature(
      session,
      requireTargetWrite ? "crm.opportunities.write" : "crm.opportunities.read",
    );
    if (denied) return denied;
  } else if (entityType === "ServiceJob") {
    const denied = requireFeature(
      session,
      requireTargetWrite ? "services.jobs.write" : "services.jobs.read",
    );
    if (denied) return denied;
  }

  const resolved = await resolveTaskLinkTarget(
    session.organisationId,
    entityType,
    entityId,
  );
  if (resolved.ok) return null;
  return NextResponse.json(
    { error: { code: resolved.code, message: resolved.message } },
    { status: 422 },
  );
}

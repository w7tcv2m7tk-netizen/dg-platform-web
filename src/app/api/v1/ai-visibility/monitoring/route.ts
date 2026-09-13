import {
  getAiVisibilityMonitoringPlan,
  ingestAiVisibilityMonitoringBatch,
  type AiVisibilityMonitoringBatch,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "growth",
    action: "view",
    scope: "organisation",
  });
  if (denied) return denied;

  const data = await getAiVisibilityMonitoringPlan(session.organisationId);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "growth",
    action: "edit",
    scope: "organisation",
  });
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as AiVisibilityMonitoringBatch | null;
  if (!body || !Array.isArray(body.observations)) {
    return NextResponse.json(
      { error: { code: "validation", message: "A monitoring batch with observations is required" } },
      { status: 422 },
    );
  }

  try {
    const data = await ingestAiVisibilityMonitoringBatch({
      organisationId: session.organisationId,
      batch: body,
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "monitoring_evidence_rejected",
          message: error instanceof Error ? error.message : "Monitoring evidence could not be accepted",
        },
      },
      { status: 422 },
    );
  }
}

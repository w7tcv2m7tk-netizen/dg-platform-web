import {
  getSeoRecurringMonitoringSettings,
  updateSeoRecurringMonitoringSettings,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  requireOrgAdmin,
  requirePermission,
  requirePlatformAuth,
} from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "growth",
    action: "view",
    scope: "organisation",
  });
  if (denied) return denied;

  const data = await getSeoRecurringMonitoringSettings(session.organisationId);
  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "growth",
    action: "edit",
    scope: "organisation",
  });
  if (denied) return denied;

  const adminDenied = requireOrgAdmin(session);
  if (adminDenied) return adminDenied;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "enabled must be true or false" } },
      { status: 400 },
    );
  }

  const data = await updateSeoRecurringMonitoringSettings({
    organisationId: session.organisationId,
    enabled: body.enabled,
  });

  return NextResponse.json({ data });
}

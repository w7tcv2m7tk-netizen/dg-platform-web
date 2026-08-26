import { NextResponse } from "next/server";
import {
  appIdsFromPlanSelection,
  assertEntitlement,
  getDefaultEnabledAppIds,
  industryBetaFlagForAppId,
  isIndustryBetaGatedApp,
  resolveEnabledAppIds,
} from "@dg/platform-core";

import { isNextResponse, requirePermission, requirePlatformSession } from "@/lib/platform-api";

type OrgSettings = {
  apps?: {
    enabled?: string[];
    planPreview?: Record<string, unknown>;
  };
  featureFlags?: Record<string, boolean>;
};

/** Enrol industry closed-beta flags when Apps toggles those floors on (dev / Founding). */
function enrolIndustryBetasForEnabled(
  featureFlags: Record<string, boolean> | undefined,
  enabled: string[],
): Record<string, boolean> {
  const next = { ...(featureFlags ?? {}) };
  for (const appId of enabled) {
    if (!isIndustryBetaGatedApp(appId)) continue;
    const flag = industryBetaFlagForAppId(appId);
    if (flag) next[flag] = true;
  }
  return next;
}

export async function GET() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      data: { enabled: getDefaultEnabledAppIds(), persisted: false },
    });
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });

  const settings = (org?.settings as OrgSettings | null) ?? {};
  const enabled = resolveEnabledAppIds(settings);

  return NextResponse.json({
    data: { enabled, planPreview: settings.apps?.planPreview ?? null, persisted: true },
  });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: { code: "no_database", message: "DATABASE_URL not configured" } },
      { status: 503 },
    );
  }

  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });

  const settings = (org?.settings as OrgSettings | null) ?? {};
  let enabled = resolveEnabledAppIds(settings);

  const paidActivation =
    body.action === "apply_plan" ||
    (body.action === "toggle" && body.enabled !== false) ||
    body.action === "set";
  if (paidActivation) {
    const gate = await assertEntitlement(session.organisationId, "activatePaidApps");
    if (!gate.ok) {
      return NextResponse.json(
        {
          error: {
            code: gate.code,
            message: gate.message,
            entitlement: gate.entitlement.level,
          },
        },
        { status: 403 },
      );
    }
  }

  if (body.action === "apply_plan" && body.plan) {
    const denied = requirePermission(session, {
      module: "settings",
      action: "manage",
      scope: "organisation",
    });
    if (denied && session.role !== "owner" && session.role !== "admin" && session.role !== "dg:staff")
      return denied;
    // Industry floors are toggled independently — no shared beta gate on install.
    enabled = appIdsFromPlanSelection(body.plan);
  } else if (body.action === "toggle" && typeof body.appId === "string") {
    const denied = requirePermission(session, {
      module: "settings",
      action: "manage",
      scope: "organisation",
    });
    if (denied && session.role !== "owner" && session.role !== "admin" && session.role !== "dg:staff")
      return denied;
    const set = new Set(enabled);
    if (body.enabled === true) set.add(body.appId);
    else if (body.enabled === false) set.delete(body.appId);
    else if (set.has(body.appId)) set.delete(body.appId);
    else set.add(body.appId);
    enabled = [...set];
  } else if (body.action === "set" && Array.isArray(body.enabled)) {
    enabled = body.enabled.filter((id: unknown) => typeof id === "string") as string[];
  } else if (body.action === "reset") {
    enabled = getDefaultEnabledAppIds();
  } else {
    return NextResponse.json(
      { error: { code: "unknown_action", message: "Unsupported action" } },
      { status: 400 },
    );
  }

  const planPreview =
    body.action === "apply_plan" && body.plan
      ? { ...body.plan, appliedAt: new Date().toISOString() }
      : settings.apps?.planPreview;

  const featureFlags = enrolIndustryBetasForEnabled(settings.featureFlags, enabled);

  await prisma.organisation.update({
    where: { id: session.organisationId },
    data: {
      settings: {
        ...settings,
        featureFlags,
        apps: {
          ...settings.apps,
          enabled,
          planPreview,
        },
      } as unknown as InputJsonValue,
    },
  });

  return NextResponse.json({ data: { enabled, planPreview } });
}

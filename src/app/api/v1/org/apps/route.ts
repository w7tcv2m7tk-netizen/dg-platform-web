import { NextResponse } from "next/server";
import {
  appIdsFromPlanSelection,
  getDefaultEnabledAppIds,
  isIndustryBetaGatedApp,
  organisationHasIndustryAppBeta,
  resolveEnabledAppIds,
} from "@dg/platform-core";

import { isNextResponse, requirePermission, requirePlatformSession } from "@/lib/platform-api";

type OrgSettings = {
  apps?: {
    enabled?: string[];
    planPreview?: Record<string, unknown>;
  };
};

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

  if (body.action === "apply_plan" && body.plan) {
    const denied = requirePermission(session, {
      module: "settings",
      action: "manage",
      scope: "organisation",
    });
    if (denied && session.role !== "owner" && session.role !== "admin") return denied;
    const next = appIdsFromPlanSelection(body.plan);
    for (const appId of next) {
      if (!isIndustryBetaGatedApp(appId)) continue;
      const enrolled = await organisationHasIndustryAppBeta(
        session.organisationId,
        appId,
      );
      if (!enrolled) {
        return NextResponse.json(
          {
            error: {
              code: "beta_required",
              message: `${appId} requires beta enrolment before it can be enabled`,
            },
          },
          { status: 403 },
        );
      }
    }
    enabled = next;
  } else if (body.action === "toggle" && typeof body.appId === "string") {
    const denied = requirePermission(session, {
      module: "settings",
      action: "manage",
      scope: "organisation",
    });
    if (denied && session.role !== "owner" && session.role !== "admin") return denied;
    const set = new Set(enabled);
    const enabling =
      body.enabled === true ||
      (body.enabled !== false && !set.has(body.appId));
    if (enabling && isIndustryBetaGatedApp(body.appId)) {
      const enrolled = await organisationHasIndustryAppBeta(
        session.organisationId,
        body.appId,
      );
      if (!enrolled) {
        return NextResponse.json(
          {
            error: {
              code: "beta_required",
              message: `${body.appId} requires beta enrolment before it can be enabled`,
            },
          },
          { status: 403 },
        );
      }
    }
    if (body.enabled === true) set.add(body.appId);
    else if (body.enabled === false) set.delete(body.appId);
    else if (set.has(body.appId)) set.delete(body.appId);
    else set.add(body.appId);
    enabled = [...set];
  } else if (body.action === "set" && Array.isArray(body.enabled)) {
    const next = body.enabled.filter((id: unknown) => typeof id === "string") as string[];
    for (const appId of next) {
      if (!isIndustryBetaGatedApp(appId)) continue;
      const enrolled = await organisationHasIndustryAppBeta(
        session.organisationId,
        appId,
      );
      if (!enrolled) {
        return NextResponse.json(
          {
            error: {
              code: "beta_required",
              message: `${appId} requires beta enrolment before it can be enabled`,
            },
          },
          { status: 403 },
        );
      }
    }
    enabled = next;
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

  await prisma.organisation.update({
    where: { id: session.organisationId },
    data: {
      settings: {
        ...settings,
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

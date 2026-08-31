import { NextResponse } from "next/server";
import {
  assertEntitlement,
  buildTemplateActivationPatch,
  getTemplate,
  industryBetaFlagForAppId,
  isIndustryBetaGatedApp,
  hasPlatformAuthority,
  isTemplateActivatable,
  readOrgIndustrySettings,
  resolveEnabledAppIds,
  resolveIndustryEntitlements,
} from "@dg/platform-core";

import { isNextResponse, requirePermission, requirePlatformSession } from "@/lib/platform-api";

type OrgSettings = {
  apps?: {
    enabled?: string[];
    planPreview?: {
      industryApps?: string[];
      [key: string]: unknown;
    };
  };
  profile?: {
    purchasedApps?: string[];
    [key: string]: unknown;
  };
  industry?: Record<string, unknown>;
  featureFlags?: Record<string, boolean>;
};

/** App id → feature flag to enrol when activating Industry Templates (testing / demo). */
const APP_ENABLE_BETA_FLAGS: Record<string, string> = {
  "real-estate": "re.beta",
  accommodation: "acc.beta",
};

function enrolIndustryBetasForAppIds(
  featureFlags: Record<string, boolean> | undefined,
  appIds: string[],
): Record<string, boolean> {
  const next = { ...(featureFlags ?? {}) };
  for (const appId of appIds) {
    if (isIndustryBetaGatedApp(appId)) {
      const flag = industryBetaFlagForAppId(appId);
      if (flag) next[flag] = true;
    }
    const extra = APP_ENABLE_BETA_FLAGS[appId];
    if (extra) next[extra] = true;
  }
  return next;
}

function entitlementsForOrg(settings: OrgSettings) {
  const enabled = resolveEnabledAppIds(settings);
  const purchasedApps = settings.profile?.purchasedApps ?? [];
  const planPreviewIndustryApps = settings.apps?.planPreview?.industryApps ?? [];
  return resolveIndustryEntitlements({
    enabledAppIds: enabled,
    purchasedApps,
    planPreviewIndustryApps,
    industrySettings: readOrgIndustrySettings(settings),
  });
}

export async function GET() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      data: {
        entitlements: resolveIndustryEntitlements({}),
        enabled: [],
        persisted: false,
      },
    });
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });

  const settings = (org?.settings as OrgSettings | null) ?? {};
  const enabled = resolveEnabledAppIds(settings);
  const entitlements = entitlementsForOrg(settings);

  return NextResponse.json({
    data: { entitlements, enabled, persisted: true },
  });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  const action = body.action;
  const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
  if ((action !== "activate" && action !== "deactivate") || !templateId) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: 'Body must be { action: "activate" | "deactivate", templateId: string }',
        },
      },
      { status: 422 },
    );
  }

  const denied = requirePermission(session, {
    module: "settings",
    action: "manage",
    scope: "organisation",
  });
  if (denied && session.role !== "owner" && session.role !== "admin" && session.role !== "dg:staff") {
    return denied;
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: { code: "no_database", message: "DATABASE_URL not configured" } },
      { status: 503 },
    );
  }

  const template = getTemplate(templateId);
  if (!template) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Unknown template" } },
      { status: 404 },
    );
  }

  if (action === "activate" && !isTemplateActivatable(template.status)) {
    return NextResponse.json(
      {
        error: {
          code:
            template.status === "COMING_SOON" || template.status === "ARCHITECTURE_RESERVED"
              ? "coming_soon"
              : "not_activatable",
          message: `Template "${template.name}" is not activatable (${template.status})`,
          status: template.status,
        },
      },
      { status: 403 },
    );
  }

  // Platform authority only — organisation slug is tenant-editable.
  const staffOrOperator = hasPlatformAuthority({
    organisationId: session.organisationId,
    role: session.role,
  });

  if (action === "activate" && !staffOrOperator) {
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

  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });

  const settings = (org?.settings as OrgSettings | null) ?? {};
  let enabled = resolveEnabledAppIds(settings);
  const currentIndustry = readOrgIndustrySettings(settings);
  const industryPatch = buildTemplateActivationPatch(
    currentIndustry,
    template.id,
    action === "activate",
  );

  if (action === "activate" && template.appId) {
    const set = new Set(enabled);
    set.add(template.appId);
    enabled = [...set];
  } else if (action === "deactivate" && template.appId) {
    const afterDeactivate = resolveIndustryEntitlements({
      enabledAppIds: enabled,
      purchasedApps: settings.profile?.purchasedApps ?? [],
      planPreviewIndustryApps: settings.apps?.planPreview?.industryApps ?? [],
      industrySettings: industryPatch,
    });
    const otherActiveSharesAppId = afterDeactivate.activeTemplateIds.some((id) => {
      if (id === template.id) return false;
      return getTemplate(id)?.appId === template.appId;
    });
    if (!otherActiveSharesAppId) {
      enabled = enabled.filter((id) => id !== template.appId);
    }
  }

  const featureFlags =
    action === "activate" && template.appId
      ? enrolIndustryBetasForAppIds(settings.featureFlags, [template.appId])
      : (settings.featureFlags ?? {});

  const nextSettings: OrgSettings = {
    ...settings,
    featureFlags,
    apps: {
      ...settings.apps,
      enabled,
    },
    industry: {
      ...(typeof settings.industry === "object" && settings.industry ? settings.industry : {}),
      templates: industryPatch.templates,
      primaryTemplateByIndustry: industryPatch.primaryTemplateByIndustry,
    },
  };

  await prisma.organisation.update({
    where: { id: session.organisationId },
    data: {
      settings: nextSettings as unknown as InputJsonValue,
    },
  });

  const entitlements = entitlementsForOrg(nextSettings);

  return NextResponse.json({
    data: { entitlements, enabled },
  });
}

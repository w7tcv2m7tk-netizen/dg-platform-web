import { NextResponse } from "next/server";
import {
  appIdsFromPlanSelection,
  assertEntitlement,
  buildTemplateActivationPatch,
  getTemplate,
  getDefaultEnabledAppIds,
  industryBetaFlagForAppId,
  isIndustryBetaGatedApp,
  isTemplateActivatable,
  hasPlatformAuthority,
  normalisePaidAppKeys,
  paidAppKeyForAppId,
  industryIdForAppOrTemplate,
  readOrgIndustrySettings,
  resolveEnabledAppIds,
} from "@dg/platform-core";

import { isNextResponse, requirePermission, requirePlatformSession } from "@/lib/platform-api";
import {
  tenantWriteEntitlementBlock,
  writeEntitlementResponse,
} from "@/lib/write-entitlement";

type OrgSettings = {
  apps?: {
    enabled?: string[];
    planPreview?: Record<string, unknown>;
  };
  profile?: {
    purchasedPremium?: unknown;
    purchasedApps?: unknown;
  };
  industry?: Record<string, unknown>;
  services?: {
    templateKey?: string;
    activeTemplateKeys?: string[];
    primaryTemplateKey?: string;
    appliedAt?: string;
    [key: string]: unknown;
  };
  featureFlags?: Record<string, boolean>;
};

/** App id → feature flag to enrol when Apps turns the floor on (testing / demo). */
const APP_ENABLE_BETA_FLAGS: Record<string, string> = {
  "real-estate": "re.beta",
  accommodation: "acc.beta",
};

const SERVICE_SUBINDUSTRY_TO_TEMPLATE: Record<string, string> = {
  electrical: "electrician",
  plumbing: "plumber",
  cleaning: "cleaner",
  maintenance: "maintenance",
  "building-construction": "builder",
  landscaping: "landscaper",
  hvac: "hvac",
  "pest-control": "pest_control",
  painting: "painter",
  handyman: "handyman",
  solar: "solar",
  "pool-service": "pool_service",
  "general-services": "general",
};

function exactIndustryTemplateIdsFromPlan(plan: unknown): string[] {
  if (!plan || typeof plan !== "object") return [];
  const industryApps = (plan as { industryApps?: unknown }).industryApps;
  if (!Array.isArray(industryApps)) return [];

  return Array.from(
    new Set(
      industryApps.flatMap((id) => {
        if (typeof id !== "string") return [];
        const template = getTemplate(id);
        // Shared runtime ids such as "services" are legacy implementation
        // markers, not permission to infer a default customer-facing child.
        return template && template.id === id && isTemplateActivatable(template.status)
          ? [template.id]
          : [];
      }),
    ),
  );
}

function syncCanonicalIndustryState(
  settings: OrgSettings,
  selectedTemplateIds: string[],
  now: string,
) {
  let industry = readOrgIndustrySettings(settings) ?? {
    templates: {},
    primaryTemplateByIndustry: {},
  };
  const selected = new Set(selectedTemplateIds);

  for (const [id, entry] of Object.entries(industry.templates ?? {})) {
    if (entry?.active === true && !selected.has(id)) {
      industry = buildTemplateActivationPatch(industry, id, false, now);
    }
  }
  for (const id of selectedTemplateIds) {
    industry = buildTemplateActivationPatch(industry, id, true, now);
  }

  const primaryTemplateByIndustry = { ...(industry.primaryTemplateByIndustry ?? {}) };
  const selectedByIndustry = new Map<string, string[]>();
  for (const id of selectedTemplateIds) {
    const template = getTemplate(id);
    if (!template) continue;
    const list = selectedByIndustry.get(template.industryId) ?? [];
    list.push(template.id);
    selectedByIndustry.set(template.industryId, list);
  }

  for (const industryId of new Set([
    ...Object.keys(primaryTemplateByIndustry),
    ...selectedByIndustry.keys(),
  ])) {
    const ids = selectedByIndustry.get(industryId) ?? [];
    if (!ids.length) {
      delete primaryTemplateByIndustry[industryId];
      continue;
    }
    const current = primaryTemplateByIndustry[industryId];
    primaryTemplateByIndustry[industryId] =
      current && ids.includes(current) ? current : ids[0]!;
  }

  const serviceTemplateKeys = selectedTemplateIds
    .map((id) => SERVICE_SUBINDUSTRY_TO_TEMPLATE[id])
    .filter((key): key is string => Boolean(key));
  const uniqueServiceTemplateKeys = Array.from(new Set(serviceTemplateKeys));
  const {
    activeTemplateKeys: _activeTemplateKeys,
    primaryTemplateKey: _primaryTemplateKey,
    templateKey: _templateKey,
    ...serviceBase
  } = settings.services ?? {};

  const services = uniqueServiceTemplateKeys.length
    ? {
        ...serviceBase,
        activeTemplateKeys: uniqueServiceTemplateKeys,
        primaryTemplateKey: uniqueServiceTemplateKeys[0],
        templateKey: uniqueServiceTemplateKeys[0],
        appliedAt: now,
      }
    : {
        ...serviceBase,
        activeTemplateKeys: [],
        appliedAt: now,
      };

  return {
    industry: { ...industry, primaryTemplateByIndustry },
    services,
  };
}

/** Enrol industry closed-beta flags when Apps toggles those floors on. */
function enrolIndustryBetasForEnabled(
  featureFlags: Record<string, boolean> | undefined,
  enabled: string[],
): Record<string, boolean> {
  const next = { ...(featureFlags ?? {}) };
  for (const appId of enabled) {
    if (isIndustryBetaGatedApp(appId)) {
      const flag = industryBetaFlagForAppId(appId);
      if (flag) next[flag] = true;
    }
    const extra = APP_ENABLE_BETA_FLAGS[appId];
    if (extra) next[extra] = true;
  }
  return next;
}

function paidAppActivationAllowed(
  appId: string,
  settings: OrgSettings,
  staffOrOperator: boolean,
): boolean {
  if (staffOrOperator) return true;
  const paidKey = paidAppKeyForAppId(appId);
  if (!paidKey) return true;
  return normalisePaidAppKeys(settings.profile?.purchasedPremium).includes(paidKey);
}

function unpaidPaidApps(
  appIds: string[],
  settings: OrgSettings,
  staffOrOperator: boolean,
): string[] {
  return appIds.filter((appId) => !paidAppActivationAllowed(appId, settings, staffOrOperator));
}

function unpaidIndustryApps(
  appIds: string[],
  settings: OrgSettings,
  staffOrOperator: boolean,
): string[] {
  if (staffOrOperator) return [];
  const purchased = Array.isArray(settings.profile?.purchasedApps)
    ? settings.profile.purchasedApps.filter((key): key is string => typeof key === "string")
    : [];
  const purchasedIndustries = new Set(
    purchased
      .map((key) => industryIdForAppOrTemplate(key))
      .filter((id): id is string => Boolean(id)),
  );
  return appIds.filter((appId) => {
    const industryId = industryIdForAppOrTemplate(appId);
    return industryId != null && !purchasedIndustries.has(industryId);
  });
}

function requireAppSettingsManage(
  session: Parameters<typeof requirePermission>[0],
): ReturnType<typeof requirePermission> {
  const denied = requirePermission(session, {
    module: "settings",
    action: "manage",
    scope: "organisation",
  });
  if (
    denied &&
    session.role !== "owner" &&
    session.role !== "admin" &&
    session.role !== "dg:staff"
  ) {
    return denied;
  }
  return null;
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
  const session = await requirePlatformSession(req);
  if (isNextResponse(session)) return session;

  // Tenant write-entitlement (H-3): block writes for read-only/suspended orgs.
  // Independent of the activatePaidApps plan gate below — both controls apply.
  const block = await tenantWriteEntitlementBlock(session);
  if (block) return writeEntitlementResponse(block);

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

  // Platform authority only — organisation slug is tenant-editable (see
  // packages/platform-core/src/access/platform-authority.ts). API-key sessions
  // are explicitly excluded by principalId even for an allowlisted operator org.
  const staffOrOperator = hasPlatformAuthority({
    organisationId: session.organisationId,
    role: session.role,
    principalId: session.clerkUserId,
  });

  const paidActivation =
    body.action === "apply_plan" ||
    (body.action === "toggle" && body.enabled !== false) ||
    body.action === "set";
  // DigitalGate interactive operator/staff sessions may toggle paid apps for testing/demo.
  if (paidActivation && !staffOrOperator) {
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
    const denied = requireAppSettingsManage(session);
    if (denied) return denied;
    const requested = appIdsFromPlanSelection(body.plan);
    const unpaid = unpaidPaidApps(requested, settings, staffOrOperator);
    const unpaidIndustry = unpaidIndustryApps(requested, settings, staffOrOperator);
    if (unpaidIndustry.length) {
      return NextResponse.json(
        {
          error: {
            code: "industry_app_purchase_required",
            message: `Purchase the relevant Industry App before activation: ${unpaidIndustry.join(", ")}`,
          },
        },
        { status: 403 },
      );
    }
    if (unpaid.length) {
      return NextResponse.json(
        {
          error: {
            code: "paid_app_purchase_required",
            message: `Purchase required before activating paid app${unpaid.length === 1 ? "" : "s"}: ${unpaid.join(", ")}`,
          },
        },
        { status: 403 },
      );
    }
    enabled = requested;
  } else if (body.action === "toggle" && typeof body.appId === "string") {
    const denied = requireAppSettingsManage(session);
    if (denied) return denied;
    const set = new Set(enabled);
    const turningOn = body.enabled === true || (body.enabled !== false && !set.has(body.appId));
    if (turningOn && unpaidIndustryApps([body.appId], settings, staffOrOperator).length) {
      return NextResponse.json(
        {
          error: {
            code: "industry_app_purchase_required",
            message: `Purchase the relevant Industry App before activating: ${body.appId}`,
          },
        },
        { status: 403 },
      );
    }
    if (turningOn && !paidAppActivationAllowed(body.appId, settings, staffOrOperator)) {
      return NextResponse.json(
        {
          error: {
            code: "paid_app_purchase_required",
            message: `Purchase required before activating paid app: ${body.appId}`,
          },
        },
        { status: 403 },
      );
    }
    if (body.enabled === true) set.add(body.appId);
    else if (body.enabled === false) set.delete(body.appId);
    else if (set.has(body.appId)) set.delete(body.appId);
    else set.add(body.appId);
    enabled = [...set];
  } else if (body.action === "set" && Array.isArray(body.enabled)) {
    const denied = requireAppSettingsManage(session);
    if (denied) return denied;
    const requested = body.enabled.filter((id: unknown) => typeof id === "string") as string[];
    const unpaid = unpaidPaidApps(requested, settings, staffOrOperator);
    const unpaidIndustry = unpaidIndustryApps(requested, settings, staffOrOperator);
    if (unpaidIndustry.length) {
      return NextResponse.json(
        {
          error: {
            code: "industry_app_purchase_required",
            message: `Purchase the relevant Industry App before activation: ${unpaidIndustry.join(", ")}`,
          },
        },
        { status: 403 },
      );
    }
    if (unpaid.length) {
      return NextResponse.json(
        {
          error: {
            code: "paid_app_purchase_required",
            message: `Purchase required before activating paid app${unpaid.length === 1 ? "" : "s"}: ${unpaid.join(", ")}`,
          },
        },
        { status: 403 },
      );
    }
    enabled = requested;
  } else if (body.action === "reset") {
    const denied = requireAppSettingsManage(session);
    if (denied) return denied;
    enabled = getDefaultEnabledAppIds();
  } else {
    return NextResponse.json(
      { error: { code: "unknown_action", message: "Unsupported action" } },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const planPreview =
    body.action === "apply_plan" && body.plan
      ? { ...body.plan, appliedAt: now }
      : body.action === "reset"
        ? undefined
        : settings.apps?.planPreview;

  const featureFlags = enrolIndustryBetasForEnabled(settings.featureFlags, enabled);

  let nextIndustry = settings.industry;
  let nextServices = settings.services;
  if (body.action === "apply_plan" && body.plan) {
    const exactTemplateIds = exactIndustryTemplateIdsFromPlan(body.plan);
    const synced = syncCanonicalIndustryState(settings, exactTemplateIds, now);
    nextIndustry = synced.industry;
    nextServices = synced.services;
  } else if (body.action === "reset") {
    const synced = syncCanonicalIndustryState(settings, [], now);
    nextIndustry = synced.industry;
    nextServices = synced.services;
  }

  await prisma.organisation.update({
    where: { id: session.organisationId },
    data: {
      settings: {
        ...settings,
        featureFlags,
        ...(nextIndustry ? { industry: nextIndustry } : {}),
        ...(nextServices ? { services: nextServices } : {}),
        apps: (() => {
          const { planPreview: _previousPlanPreview, ...appsBase } = settings.apps ?? {};
          return planPreview
            ? { ...appsBase, enabled, planPreview }
            : { ...appsBase, enabled };
        })(),
      } as unknown as InputJsonValue,
    },
  });

  return NextResponse.json({ data: { enabled, planPreview: planPreview ?? null } });
}

import { NextResponse } from "next/server";
import {
  appIdsFromPlanSelection,
  assertEntitlement,
  getDefaultEnabledAppIds,
  industryBetaFlagForAppId,
  isIndustryBetaGatedApp,
  hasPlatformAuthority,
  normalisePaidAppKeys,
  paidAppKeyForAppId,
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
  };
  featureFlags?: Record<string, boolean>;
};

/** App id → feature flag to enrol when Apps turns the floor on (testing / demo). */
const APP_ENABLE_BETA_FLAGS: Record<string, string> = {
  "real-estate": "re.beta",
  accommodation: "acc.beta",
};

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
  // packages/platform-core/src/access/platform-authority.ts).
  const staffOrOperator = hasPlatformAuthority({
    organisationId: session.organisationId,
    role: session.role,
  });

  const paidActivation =
    body.action === "apply_plan" ||
    (body.action === "toggle" && body.enabled !== false) ||
    body.action === "set";
  // DigitalGate operator org + staff: always allow Industry toggles for testing/demo.
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
    const denied = requirePermission(session, {
      module: "settings",
      action: "manage",
      scope: "organisation",
    });
    if (denied && session.role !== "owner" && session.role !== "admin" && session.role !== "dg:staff")
      return denied;
    const requested = appIdsFromPlanSelection(body.plan);
    const unpaid = unpaidPaidApps(requested, settings, staffOrOperator);
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
    const denied = requirePermission(session, {
      module: "settings",
      action: "manage",
      scope: "organisation",
    });
    if (denied && session.role !== "owner" && session.role !== "admin" && session.role !== "dg:staff")
      return denied;
    const set = new Set(enabled);
    const turningOn = body.enabled === true || (body.enabled !== false && !set.has(body.appId));
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
    const requested = body.enabled.filter((id: unknown) => typeof id === "string") as string[];
    const unpaid = unpaidPaidApps(requested, settings, staffOrOperator);
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

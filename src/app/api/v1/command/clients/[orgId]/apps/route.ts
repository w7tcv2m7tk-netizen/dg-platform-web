import { NextResponse } from "next/server";
import {
  APP_TIER_LABELS,
  FOUNDING_MODE_CORE_APP_IDS,
  platformApps,
  resolveEnabledAppIds,
} from "@dg/platform-core";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

type OrgSettings = {
  apps?: {
    enabled?: string[];
    planPreview?: {
      platformTier?: string;
      industryApps?: string[];
      premiumApps?: string[];
      appliedAt?: string;
    };
  };
  profile?: {
    purchasedApps?: string[];
    purchasedPremium?: unknown;
  };
};

function normaliseStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function buildResponse(org: { id: string; name: string; slug: string; settings: unknown }) {
  const settings = (org.settings as OrgSettings | null) ?? {};
  const enabled = resolveEnabledAppIds(settings);
  const core = new Set<string>(FOUNDING_MODE_CORE_APP_IDS);
  const plan = settings.apps?.planPreview ?? null;

  const apps = platformApps.customerApps().map(({ manifest }) => ({
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    tier: manifest.tier,
    tierLabel: APP_TIER_LABELS[manifest.tier],
    enabled: enabled.includes(manifest.id),
    required: core.has(manifest.id),
  }));

  return {
    organisation: { id: org.id, name: org.name, slug: org.slug },
    subscription: {
      platformTier: plan?.platformTier ?? null,
      industryApps: normaliseStringList(plan?.industryApps),
      premiumApps: normaliseStringList(plan?.premiumApps),
      purchasedApps: normaliseStringList(settings.profile?.purchasedApps),
      purchasedPremium: normaliseStringList(settings.profile?.purchasedPremium),
      appliedAt: plan?.appliedAt ?? null,
    },
    apps,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const auth = await requirePlatformOperator(req, "command.flags.manage");
  if (isNextResponse(auth)) return auth;

  const { orgId } = await params;
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true, settings: true },
  });

  if (!org) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Organisation not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: buildResponse(org) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const auth = await requirePlatformOperator(req, "command.flags.manage");
  if (isNextResponse(auth)) return auth;

  const { orgId } = await params;
  const body = await req.json().catch(() => null);
  const appId = typeof body?.appId === "string" ? body.appId.trim() : "";
  const enabled = body?.enabled;

  if (!appId || typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "appId and enabled are required" } },
      { status: 422 },
    );
  }

  const registered = platformApps.get(appId);
  if (!registered?.enabled || (registered.manifest.visibility ?? "customer") !== "customer") {
    return NextResponse.json(
      { error: { code: "unknown_app", message: "Customer app not found" } },
      { status: 404 },
    );
  }

  if (!enabled && (FOUNDING_MODE_CORE_APP_IDS as readonly string[]).includes(appId)) {
    return NextResponse.json(
      { error: { code: "core_app_required", message: "Core platform apps cannot be disabled" } },
      { status: 422 },
    );
  }

  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true, settings: true },
  });

  if (!org) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Organisation not found" } },
      { status: 404 },
    );
  }

  const settings = (org.settings as OrgSettings | null) ?? {};
  const next = new Set(resolveEnabledAppIds(settings));
  if (enabled) next.add(appId);
  else next.delete(appId);

  const updated = await prisma.organisation.update({
    where: { id: orgId },
    data: {
      settings: {
        ...settings,
        apps: {
          ...settings.apps,
          enabled: [...next],
        },
      } as unknown as InputJsonValue,
    },
    select: { id: true, name: true, slug: true, settings: true },
  });

  return NextResponse.json({ data: buildResponse(updated) });
}

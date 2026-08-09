/**
 * Website Builder closed beta — feature flag, readiness checklist, staff provision.
 * @see docs/WEBSITES-BETA-LAUNCH.md
 */

import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import {
  organisationHasFlag,
  updateOrganisationFeatureFlags,
} from "../features/flags";
import { WEBSITES_BUILDER_FLAG } from "./access";

/** Org flag that enrols Website Builder closed beta (same as Studio gate). */
export const WEBSITES_BETA_FLAG = WEBSITES_BUILDER_FLAG;

export type WebsitesBetaChecklistItemId =
  | "flag"
  | "app"
  | "profile"
  | "site"
  | "studio"
  | "publish_or_preview"
  | "domain";

export type WebsitesBetaChecklistItem = {
  id: WebsitesBetaChecklistItemId;
  label: string;
  done: boolean;
  href: string;
  hint: string;
};

export type WebsitesBetaReadiness = {
  organisationId: string;
  betaEnabled: boolean;
  appInstalled: boolean;
  completedCount: number;
  totalCount: number;
  readyForPilot: boolean;
  items: WebsitesBetaChecklistItem[];
  siteCount: number;
  publishedCount: number;
  domainLinkedCount: number;
};

type OrgSettings = {
  featureFlags?: Record<string, boolean>;
  apps?: { enabled?: string[] };
  profile?: { abn?: string; logoUrl?: string; tradingName?: string };
};

export async function organisationHasWebsitesBeta(
  organisationId: string,
): Promise<boolean> {
  return organisationHasFlag(organisationId, WEBSITES_BETA_FLAG);
}

/** Getting-started checklist for Websites hub. */
export async function getWebsitesBetaReadiness(
  organisationId: string,
): Promise<WebsitesBetaReadiness> {
  const { prisma } = await import("@dg/database");

  const [org, profile, sites, domains] = await Promise.all([
    prisma.organisation.findUnique({
      where: { id: organisationId },
      select: {
        settings: true,
        appInstallations: {
          where: { appId: "websites", enabled: true },
          select: { id: true },
        },
      },
    }),
    getOrganisationBusinessProfile(organisationId),
    prisma.website.findMany({
      where: { organisationId },
      select: {
        id: true,
        status: true,
        _count: { select: { pages: true } },
      },
    }),
    prisma.infrastructureDomain.findMany({
      where: { organisationId },
      select: { id: true, websiteId: true },
    }),
  ]);

  const settings = (org?.settings as OrgSettings | null) ?? {};
  const betaEnabled = settings.featureFlags?.[WEBSITES_BETA_FLAG] === true;
  const appInstalled =
    (org?.appInstallations?.length ?? 0) > 0 ||
    (settings.apps?.enabled ?? []).includes("websites");
  const hasProfile = Boolean(
    profile?.tradingName?.trim() ||
      profile?.abn?.trim() ||
      settings.profile?.tradingName?.trim() ||
      settings.profile?.abn?.trim(),
  );
  const siteCount = sites.length;
  const publishedCount = sites.filter((s) => s.status === "published").length;
  const hasSite = siteCount > 0;
  const hasPages = sites.some((s) => s._count.pages > 0);
  const domainLinkedCount = domains.filter((d) => d.websiteId).length;
  const hasDomain = domainLinkedCount > 0 || domains.length > 0;

  const items: WebsitesBetaChecklistItem[] = [
    {
      id: "flag",
      label: "Website Builder beta enabled",
      done: betaEnabled,
      href: "/apps/websites",
      hint: "Ask DigitalGate — Command Centre → Clients → Enable Websites beta",
    },
    {
      id: "app",
      label: "Websites app installed",
      done: appInstalled,
      href: "/apps/websites",
      hint: "Staff Enable Websites beta installs the app",
    },
    {
      id: "profile",
      label: "Business Profile started",
      done: hasProfile,
      href: "/dashboard/business",
      hint: "Trading name / ABN helps AI generate better sites",
    },
    {
      id: "site",
      label: "Create a Gen 2 website",
      done: hasSite,
      href: "/apps/websites",
      hint: "Generate from profile or import WordPress pages",
    },
    {
      id: "studio",
      label: "Open Studio (pages ready)",
      done: hasPages,
      href: "/apps/websites",
      hint: "Edit blocks, SEO, and WordPress import in Studio",
    },
    {
      id: "publish_or_preview",
      label: "Preview or publish",
      done: publishedCount > 0 || hasPages,
      href: "/apps/websites",
      hint: "Use Preview (?preview=1) then Publish when ready",
    },
    {
      id: "domain",
      label: "Connect or register a domain",
      done: hasDomain,
      href: "/apps/infrastructure/domains",
      hint: "Infrastructure → Domains → connect or Make it live",
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const readyForPilot =
    betaEnabled && appInstalled && hasSite && hasPages && hasProfile;

  return {
    organisationId,
    betaEnabled,
    appInstalled,
    completedCount,
    totalCount: items.length,
    readyForPilot,
    items,
    siteCount,
    publishedCount,
    domainLinkedCount,
  };
}

export async function provisionWebsitesBetaOrganisation(input: {
  organisationId: string;
  actorId?: string;
}): Promise<{
  organisationId: string;
  flags: Record<string, boolean>;
  appInstalled: boolean;
}> {
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { id: true, settings: true },
  });
  if (!org) throw new Error("Organisation not found");

  const settings = (org.settings as OrgSettings | null) ?? {};
  const enabled = new Set(settings.apps?.enabled ?? []);
  enabled.add("websites");
  enabled.add("crm");
  enabled.add("infrastructure");

  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      settings: {
        ...settings,
        apps: { ...settings.apps, enabled: [...enabled] },
      } as unknown as InputJsonValue,
    },
  });

  for (const appId of ["websites", "infrastructure"] as const) {
    const existing = await prisma.appInstallation.findFirst({
      where: { organisationId: org.id, appId },
    });
    if (existing) {
      if (!existing.enabled) {
        await prisma.appInstallation.update({
          where: { id: existing.id },
          data: { enabled: true },
        });
      }
    } else {
      await prisma.appInstallation.create({
        data: {
          organisationId: org.id,
          appId,
          version: "1.0.0",
          enabled: true,
        },
      });
    }
  }

  const flags = await updateOrganisationFeatureFlags({
    organisationId: org.id,
    actorId: input.actorId,
    flags: { [WEBSITES_BETA_FLAG]: true },
  });

  return {
    organisationId: org.id,
    flags,
    appInstalled: true,
  };
}

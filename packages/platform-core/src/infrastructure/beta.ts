/**
 * Infrastructure Domains closed beta — enrolment flag, checklist, staff provision.
 * @see docs/INFRASTRUCTURE-BETA-LAUNCH.md
 *
 * Domains search/connect stays available when Infrastructure is installed.
 * Paid register still requires `infra.domain_register` separately.
 */

import {
  organisationHasFlag,
  updateOrganisationFeatureFlags,
} from "../features/flags";
import { isDreamscapeConfigured, resolveDreamscapeConfig } from "./providers/dreamscape";

/** Org enrolment flag for Domains closed beta (does not gate search by itself). */
export const INFRA_DOMAINS_BETA_FLAG = "infra.domains_beta" as const;

export type InfraDomainsBetaChecklistItemId =
  | "flag"
  | "app"
  | "provider"
  | "search"
  | "inventory"
  | "dns_or_live"
  | "register_gate";

export type InfraDomainsBetaChecklistItem = {
  id: InfraDomainsBetaChecklistItemId;
  label: string;
  done: boolean;
  href: string;
  hint: string;
};

export type InfraDomainsBetaReadiness = {
  organisationId: string;
  betaEnabled: boolean;
  appInstalled: boolean;
  providerConfigured: boolean;
  isSandbox: boolean;
  soapEnv: string;
  soapHost: string;
  domainRegisterEnabled: boolean;
  completedCount: number;
  totalCount: number;
  readyForPilot: boolean;
  items: InfraDomainsBetaChecklistItem[];
  domainCount: number;
};

type OrgSettings = {
  featureFlags?: Record<string, boolean>;
  apps?: { enabled?: string[] };
};

export async function organisationHasInfraDomainsBeta(
  organisationId: string,
): Promise<boolean> {
  return organisationHasFlag(organisationId, INFRA_DOMAINS_BETA_FLAG);
}

export async function getInfraDomainsBetaReadiness(
  organisationId: string,
): Promise<InfraDomainsBetaReadiness> {
  const { prisma } = await import("@dg/database");
  const cfg = resolveDreamscapeConfig();
  const providerConfigured = isDreamscapeConfigured();

  const [org, domains] = await Promise.all([
    prisma.organisation.findUnique({
      where: { id: organisationId },
      select: {
        settings: true,
        appInstallations: {
          where: { appId: "infrastructure", enabled: true },
          select: { id: true },
        },
      },
    }),
    prisma.infrastructureDomain.findMany({
      where: { organisationId },
      select: {
        id: true,
        dnsConfiguredAt: true,
        sslState: true,
        websiteId: true,
        status: true,
      },
    }),
  ]);

  const settings = (org?.settings as OrgSettings | null) ?? {};
  const betaEnabled = settings.featureFlags?.[INFRA_DOMAINS_BETA_FLAG] === true;
  const appInstalled =
    (org?.appInstallations?.length ?? 0) > 0 ||
    (settings.apps?.enabled ?? []).includes("infrastructure");
  const domainRegisterEnabled =
    settings.featureFlags?.["infra.domain_register"] === true;
  const domainCount = domains.length;
  const hasDnsOrLive = domains.some(
    (d) =>
      Boolean(d.dnsConfiguredAt) ||
      d.sslState === "active" ||
      d.status === "active" ||
      Boolean(d.websiteId),
  );

  const items: InfraDomainsBetaChecklistItem[] = [
    {
      id: "flag",
      label: "Domains beta enrolled",
      done: betaEnabled,
      href: "/apps/infrastructure/domains",
      hint: "Command Centre → Clients → Enable Domains beta",
    },
    {
      id: "app",
      label: "Infrastructure app installed",
      done: appInstalled,
      href: "/apps/infrastructure/domains",
      hint: "Staff Enable Domains beta installs Infrastructure",
    },
    {
      id: "provider",
      label: "Domain API configured (platform)",
      done: providerConfigured,
      href: "/apps/infrastructure/domains",
      hint: "Vercel: DREAMSCAPE_RESELLER_ID + API_KEY + SOAP_ENV=production",
    },
    {
      id: "search",
      label: "Domain search works",
      done: providerConfigured,
      href: "/apps/infrastructure/domains",
      hint: "Search a .com.au — must hit /API-1.3 (not server.php)",
    },
    {
      id: "inventory",
      label: "Connect or register a domain",
      done: domainCount > 0,
      href: "/apps/infrastructure/domains",
      hint: "Connect existing or register (paid path needs infra.domain_register)",
    },
    {
      id: "dns_or_live",
      label: "Apply DNS / Make it live",
      done: hasDnsOrLive,
      href: "/apps/infrastructure/domains",
      hint: "Link a website and apply hosting DNS / SSL",
    },
    {
      id: "register_gate",
      label: "Paid register gate understood",
      done: true,
      href: "/apps/infrastructure/domains",
      hint: domainRegisterEnabled
        ? "infra.domain_register is ON — charges reseller on production"
        : "Keep infra.domain_register OFF until ready to charge",
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const readyForPilot =
    betaEnabled && appInstalled && providerConfigured && domainCount > 0;

  return {
    organisationId,
    betaEnabled,
    appInstalled,
    providerConfigured,
    isSandbox: cfg.isSandbox,
    soapEnv: cfg.soapEnv,
    soapHost: cfg.activeEndpoint,
    domainRegisterEnabled,
    completedCount,
    totalCount: items.length,
    readyForPilot,
    items,
    domainCount,
  };
}

export async function provisionInfraDomainsBetaOrganisation(input: {
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
  enabled.add("infrastructure");
  enabled.add("websites");

  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      settings: {
        ...settings,
        apps: { ...settings.apps, enabled: [...enabled] },
      } as unknown as InputJsonValue,
    },
  });

  const existing = await prisma.appInstallation.findFirst({
    where: { organisationId: org.id, appId: "infrastructure" },
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
        appId: "infrastructure",
        version: "1.0.0",
        enabled: true,
      },
    });
  }

  // Enrol Domains beta — does NOT enable paid register (separate flag).
  const flags = await updateOrganisationFeatureFlags({
    organisationId: org.id,
    actorId: input.actorId,
    flags: { [INFRA_DOMAINS_BETA_FLAG]: true },
  });

  return {
    organisationId: org.id,
    flags,
    appInstalled: true,
  };
}

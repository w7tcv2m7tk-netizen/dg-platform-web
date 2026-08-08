/**
 * Accommodation closed beta — feature flag, readiness checklist, staff provision.
 * @see docs/ACC-BETA-LAUNCH.md
 */

import type { OrgWordPressConnectorSettings } from "../connectors/wordpress/org-connector";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import {
  organisationHasFlag,
  updateOrganisationFeatureFlags,
} from "../features/flags";

/** Org settings flag that gates the Accommodation app for beta properties. */
export const ACC_BETA_FLAG = "acc.beta" as const;

export type AccBetaChecklistItemId =
  | "flag"
  | "app"
  | "profile_abn"
  | "profile_logo"
  | "wordpress"
  | "team"
  | "unit"
  | "booking";

export type AccBetaChecklistItem = {
  id: AccBetaChecklistItemId;
  label: string;
  done: boolean;
  href: string;
  hint: string;
};

export type AccBetaReadiness = {
  organisationId: string;
  betaEnabled: boolean;
  appInstalled: boolean;
  completedCount: number;
  totalCount: number;
  readyForPilot: boolean;
  items: AccBetaChecklistItem[];
  connectorConfigured: boolean;
  connectorLastSyncAt: string | null;
};

type OrgSettings = {
  featureFlags?: Record<string, boolean>;
  apps?: { enabled?: string[] };
  connectors?: { wordpress?: OrgWordPressConnectorSettings };
  profile?: { abn?: string; logoUrl?: string };
};

/** True when a real key exists or Acc sync has already succeeded (not URL-only presets). */
function wpConfigured(settings: OrgSettings | null): boolean {
  const wp = settings?.connectors?.wordpress;
  return Boolean(wp?.apiKey?.trim() || wp?.lastAccBookingSyncAt);
}

function wpLastSync(settings: OrgSettings | null): string | null {
  const wp = settings?.connectors?.wordpress;
  return wp?.lastAccBookingSyncAt ?? wp?.lastBookingSyncAt ?? null;
}

/** True when org may use `/apps/accommodation` (beta flag on). */
export async function organisationHasAccBeta(
  organisationId: string,
): Promise<boolean> {
  return organisationHasFlag(organisationId, ACC_BETA_FLAG);
}

/**
 * Filter enabled app IDs so Accommodation only appears when `acc.beta` is on.
 * Call after resolveEnabledAppIds (and after RE beta filter if both apply).
 */
export function filterAppsForAccBeta(
  enabledAppIds: string[],
  featureFlags: Record<string, boolean> | undefined | null,
): string[] {
  if (featureFlags?.[ACC_BETA_FLAG] === true) return enabledAppIds;
  return enabledAppIds.filter((id) => id !== "accommodation");
}

/** Getting-started checklist for Acc overview. */
export async function getAccBetaReadiness(
  organisationId: string,
): Promise<AccBetaReadiness> {
  const { prisma } = await import("@dg/database");

  const [org, profile, membershipCount, unitCount, bookingCount] = await Promise.all([
    prisma.organisation.findUnique({
      where: { id: organisationId },
      select: {
        settings: true,
        appInstallations: {
          where: { appId: "accommodation", enabled: true },
          select: { id: true },
        },
      },
    }),
    getOrganisationBusinessProfile(organisationId),
    prisma.membership.count({
      where: { organisationId, status: "active" },
    }),
    prisma.accommodationUnit.count({ where: { organisationId } }),
    prisma.stayBooking.count({ where: { organisationId } }),
  ]);

  const settings = (org?.settings as OrgSettings | null) ?? {};
  const betaEnabled = settings.featureFlags?.[ACC_BETA_FLAG] === true;
  const appInstalled = (org?.appInstallations.length ?? 0) > 0;
  const connectorConfigured = wpConfigured(settings);
  const hasAbn = Boolean(profile?.abn?.trim() || settings.profile?.abn?.trim());
  const hasLogo = Boolean(
    profile?.logoUrl?.trim() || settings.profile?.logoUrl?.trim(),
  );
  const hasTeam = membershipCount > 1;
  const hasUnit = unitCount > 0;
  const hasBooking = bookingCount > 0;

  const items: AccBetaChecklistItem[] = [
    {
      id: "flag",
      label: "Acc beta enabled",
      done: betaEnabled,
      href: "/dashboard/apps",
      hint: "Ask DigitalGate to run Enable Acc beta on Command Centre → Clients (not Flags-only)",
    },
    {
      id: "app",
      label: "Accommodation app installed",
      done: appInstalled,
      href: "/dashboard/apps",
      hint: "Staff Enable Acc beta installs the app — Flags-only may leave this unchecked",
    },
    {
      id: "profile_abn",
      label: "Business Profile ABN",
      done: hasAbn,
      href: "/dashboard/business",
      hint: "Add your ABN so invoices and workspace identity look professional",
    },
    {
      id: "profile_logo",
      label: "Property logo",
      done: hasLogo,
      href: "/dashboard/business",
      hint: "Upload logo for letterheads and the workspace brand",
    },
    {
      id: "wordpress",
      label: "WordPress connector",
      done: connectorConfigured,
      href: "/dashboard/settings/connectors",
      hint: "Paste the property site Dev API key (base URL alone from a template preset is not enough)",
    },
    {
      id: "team",
      label: "Invite a teammate",
      done: hasTeam,
      href: "/dashboard/settings/team",
      hint: "Invite at least one ops/front-desk user so the org isn’t a solo sandbox",
    },
    {
      id: "unit",
      label: "First unit synced",
      done: hasUnit,
      href: "/apps/accommodation/units",
      hint: "Sync units from WordPress (plugin 10.63.0+), then confirm OTA iCal fields",
    },
    {
      id: "booking",
      label: "First stay booking",
      done: hasBooking,
      href: "/apps/accommodation/bookings",
      hint: "Sync StayBookings from WordPress or create an ops booking on Availability",
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  /** Pilot-ready: flag + app + connector + identity + at least one unit in Neon. */
  const readyForPilot =
    betaEnabled && appInstalled && connectorConfigured && hasAbn && hasUnit;

  return {
    organisationId,
    betaEnabled,
    appInstalled,
    completedCount,
    totalCount: items.length,
    readyForPilot,
    items,
    connectorConfigured,
    connectorLastSyncAt: wpLastSync(settings),
  };
}

/**
 * Staff action: enable Acc beta for an organisation (flag + app install + industry).
 */
export async function provisionAccBetaOrganisation(input: {
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
    select: { id: true, settings: true, industry: true },
  });
  if (!org) throw new Error("Organisation not found");

  const settings = (org.settings as OrgSettings | null) ?? {};
  const enabled = new Set(settings.apps?.enabled ?? []);
  enabled.add("accommodation");
  // Keep CRM + Commerce available for guest Contacts and payments
  enabled.add("crm");
  enabled.add("commerce");

  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      industry: org.industry ?? "hospitality",
      settings: {
        ...settings,
        apps: { ...settings.apps, enabled: [...enabled] },
      } as unknown as InputJsonValue,
    },
  });

  const existing = await prisma.appInstallation.findFirst({
    where: { organisationId: org.id, appId: "accommodation" },
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
        appId: "accommodation",
        version: "1.0.0",
        enabled: true,
      },
    });
  }

  const flags = await updateOrganisationFeatureFlags({
    organisationId: org.id,
    actorId: input.actorId,
    flags: { [ACC_BETA_FLAG]: true },
  });

  return {
    organisationId: org.id,
    flags,
    appInstalled: true,
  };
}

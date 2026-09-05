/**
 * Real Estate agency beta — feature flag, readiness checklist, staff provision.
 * @see docs/RE-BETA-LAUNCH.md
 */

import type { OrgWordPressConnectorSettings } from "../connectors/wordpress/org-connector";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import {
  organisationHasFlag,
  updateOrganisationFeatureFlags,
} from "../features/flags";

/** Org settings flag that gates the Real Estate app for beta agencies. */
export const RE_BETA_FLAG = "re.beta" as const;

export type ReBetaChecklistItemId =
  | "flag"
  | "profile_abn"
  | "profile_logo"
  | "team"
  | "vendor_lead"
  | "appraisal";

export type ReBetaChecklistItem = {
  id: ReBetaChecklistItemId;
  label: string;
  done: boolean;
  href: string;
  hint: string;
};

export type ReBetaReadiness = {
  organisationId: string;
  betaEnabled: boolean;
  appInstalled: boolean;
  completedCount: number;
  totalCount: number;
  readyForPilot: boolean;
  items: ReBetaChecklistItem[];
  connectorConfigured: boolean;
  connectorLastSyncAt: string | null;
};

type OrgSettings = {
  featureFlags?: Record<string, boolean>;
  apps?: { enabled?: string[] };
  connectors?: { wordpress?: OrgWordPressConnectorSettings };
  profile?: { abn?: string; logoUrl?: string };
};

function wpConfigured(settings: OrgSettings | null): boolean {
  const wp = settings?.connectors?.wordpress;
  return Boolean(wp?.baseUrl?.trim() || wp?.apiKey?.trim() || wp?.lastVendorLeadSyncAt);
}

function wpLastSync(settings: OrgSettings | null): string | null {
  const wp = settings?.connectors?.wordpress;
  return (
    wp?.lastVendorLeadSyncAt ??
    wp?.lastBuyerLeadSyncAt ??
    wp?.lastBookingSyncAt ??
    wp?.lastPropertySyncAt ??
    null
  );
}

/** True when org may use `/apps/re` (beta flag on). */
export async function organisationHasReBeta(
  organisationId: string,
): Promise<boolean> {
  return organisationHasFlag(organisationId, RE_BETA_FLAG);
}

/**
 * Filter enabled app IDs so Real Estate only appears when `re.beta` is on.
 * Call after resolveEnabledAppIds.
 */
export function filterAppsForReBeta(
  enabledAppIds: string[],
  featureFlags: Record<string, boolean> | undefined | null,
): string[] {
  if (featureFlags?.[RE_BETA_FLAG] === true) return enabledAppIds;
  return enabledAppIds.filter((id) => id !== "real-estate");
}

/** Getting-started checklist for RE overview. */
export async function getReBetaReadiness(
  organisationId: string,
): Promise<ReBetaReadiness> {
  const { prisma } = await import("@dg/database");

  const [org, profile, membershipCount, vendorLeadCount, appraisalCount, bookingCount] =
    await Promise.all([
      prisma.organisation.findUnique({
        where: { id: organisationId },
        select: {
          settings: true,
          appInstallations: {
            where: { appId: "real-estate", enabled: true },
            select: { id: true },
          },
        },
      }),
      getOrganisationBusinessProfile(organisationId),
      prisma.membership.count({
        where: { organisationId, status: "active" },
      }),
      prisma.lead.count({
        where: {
          organisationId,
          NOT: { source: { in: ["buyer_enquiry", "re_booking"] } },
        },
      }),
      prisma.property.count({
        where: {
          organisationId,
          deletedAt: null,
          status: {
            in: [
              "appraisal",
              "listed",
              "under_offer",
              "contract_signed",
              "unconditional",
              "sold",
            ],
          },
        },
      }),
      prisma.lead.count({
        where: { organisationId, source: "re_booking" },
      }),
    ]);

  const settings = (org?.settings as OrgSettings | null) ?? {};
  const betaEnabled = settings.featureFlags?.[RE_BETA_FLAG] === true;
  const appInstalled = (org?.appInstallations.length ?? 0) > 0;
  const connectorConfigured = wpConfigured(settings);
  const hasAbn = Boolean(profile?.abn?.trim() || settings.profile?.abn?.trim());
  const hasLogo = Boolean(
    profile?.logoUrl?.trim() || settings.profile?.logoUrl?.trim(),
  );
  const hasTeam = membershipCount > 1;
  const hasVendorLead = vendorLeadCount > 0;
  const hasAppraisal = appraisalCount > 0 || bookingCount > 0;

  const items: ReBetaChecklistItem[] = [
    {
      id: "flag",
      label: "RE beta enabled",
      done: betaEnabled,
      href: "/dashboard/apps",
      hint: "DigitalGate staff enable re.beta in Command Centre → Flags",
    },
    {
      id: "profile_abn",
      label: "Business Profile ABN",
      done: hasAbn,
      href: "/dashboard/business",
      hint: "Add your ABN so invoices and quotes look professional",
    },
    {
      id: "profile_logo",
      label: "Agency logo",
      done: hasLogo,
      href: "/dashboard/business",
      hint: "Upload logo for letterheads and the workspace brand",
    },
    {
      id: "team",
      label: "Invite a teammate",
      done: hasTeam,
      href: "/dashboard/settings/team",
      hint: "Invite at least one agent so the org isn’t a solo sandbox",
    },
    {
      id: "vendor_lead",
      label: "First vendor lead",
      done: hasVendorLead,
      href: "/apps/re/vendor-leads",
      hint: "Add your first vendor lead directly in DigitalGate",
    },
    {
      id: "appraisal",
      label: "First appraisal or booking",
      done: hasAppraisal,
      href: "/apps/re/vendor-leads",
      hint: "Open a vendor lead → Start appraisal, or create a booking under Bookings",
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  /** Pilot-ready: native beta + app + identity + at least one vendor lead in Platform Core. */
  const readyForPilot =
    betaEnabled && appInstalled && hasAbn && hasVendorLead;

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
 * Staff action: enable RE beta for an organisation (flag + app install + industry).
 */
export async function provisionReBetaOrganisation(input: {
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
  enabled.add("real-estate");
  // Keep CRM + Commerce available for the RE workflow
  enabled.add("crm");
  enabled.add("commerce");

  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      industry: org.industry ?? "real_estate",
      settings: {
        ...settings,
        apps: { ...settings.apps, enabled: [...enabled] },
      } as unknown as InputJsonValue,
    },
  });

  const existing = await prisma.appInstallation.findFirst({
    where: { organisationId: org.id, appId: "real-estate" },
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
        appId: "real-estate",
        version: "1.0.0",
        enabled: true,
      },
    });
  }

  const flags = await updateOrganisationFeatureFlags({
    organisationId: org.id,
    actorId: input.actorId,
    flags: { [RE_BETA_FLAG]: true },
  });

  return {
    organisationId: org.id,
    flags,
    appInstalled: true,
  };
}

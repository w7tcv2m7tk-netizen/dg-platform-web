import type { PortalOnboardingProfile } from "../connectors/portal-types";
import { appIdsFromPlanSelection } from "../apps/org-apps";

export type { PortalOnboardingProfile };

export type OrganisationBusinessProfile = {
  businessName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessPhone?: string;
  businessEmail?: string;
  abn?: string;
  gstNumber?: string;
  industryLicenseNumber?: string;
  position?: string;
  logoUrl?: string;
  brandColours?: string;
  websiteUrl?: string;
  industryVertical?: string;
  platformTier?: string;
  purchasedApps?: string[];
  purchasedPremium?: string[];
  purchasedAddons?: string[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  wpContactId?: number;
  wpOrganisationId?: number;
  purchaseLabel?: string;
  syncedAt?: string;
};

type OrgSettings = {
  profile?: OrganisationBusinessProfile;
  apps?: { enabled?: string[]; planPreview?: unknown };
};

const SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000;

function mapPortalProfile(
  onboarding: PortalOnboardingProfile,
  extras: {
    wpContactId?: number;
    wpOrganisationId?: number;
    purchaseLabel?: string;
  },
): OrganisationBusinessProfile {
  return {
    businessName: onboarding.business_name || undefined,
    contactName: onboarding.contact_name || undefined,
    contactEmail: onboarding.contact_email || undefined,
    contactPhone: onboarding.contact_phone || undefined,
    businessPhone: onboarding.phone || undefined,
    businessEmail: onboarding.business_email || undefined,
    abn: onboarding.abn || undefined,
    gstNumber: onboarding.gst_number || undefined,
    industryLicenseNumber: onboarding.industry_license_number || undefined,
    position: onboarding.position || undefined,
    logoUrl: onboarding.logo_url || undefined,
    brandColours: onboarding.brand_colours || undefined,
    websiteUrl: onboarding.website_url || undefined,
    industryVertical: onboarding.industry_vertical || undefined,
    platformTier: onboarding.platform_tier || undefined,
    purchasedApps: onboarding.purchased_apps?.length ? onboarding.purchased_apps : undefined,
    purchasedPremium: onboarding.purchased_premium?.length
      ? onboarding.purchased_premium
      : undefined,
    purchasedAddons: onboarding.purchased_addons?.length
      ? onboarding.purchased_addons
      : undefined,
    address: {
      street: onboarding.street_address || undefined,
      city: onboarding.city || undefined,
      state: onboarding.state || undefined,
      postcode: onboarding.postcode || undefined,
      country: onboarding.country || undefined,
    },
    wpContactId: extras.wpContactId,
    wpOrganisationId: extras.wpOrganisationId,
    purchaseLabel: extras.purchaseLabel,
    syncedAt: new Date().toISOString(),
  };
}

function isAutoOrgName(name: string): boolean {
  return /'s Organisation$/i.test(name) || /^My Organisation$/i.test(name);
}

export async function getOrganisationBusinessProfile(
  organisationId: string,
): Promise<OrganisationBusinessProfile | null> {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const settings = (org?.settings as OrgSettings | null) ?? {};
  return settings.profile ?? null;
}

export async function syncOrganisationFromPortal(input: {
  organisationId: string;
  organisationName: string;
  portal: {
    linked: boolean;
    contact_id?: number;
    organisation_id?: number;
    org_name?: string;
    purchase_label?: string;
    onboarding?: PortalOnboardingProfile | null;
  };
  force?: boolean;
}): Promise<{ synced: boolean; profile?: OrganisationBusinessProfile }> {
  if (!process.env.DATABASE_URL) return { synced: false };
  if (!input.portal.linked || !input.portal.onboarding) return { synced: false };

  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { settings: true, name: true, industry: true },
  });
  if (!org) return { synced: false };

  const settings = (org.settings as OrgSettings | null) ?? {};
  const lastSync = settings.profile?.syncedAt;
  if (!input.force && lastSync) {
    const elapsed = Date.now() - new Date(lastSync).getTime();
    if (elapsed < SYNC_INTERVAL_MS) {
      return { synced: false, profile: settings.profile };
    }
  }

  const profile = mapPortalProfile(input.portal.onboarding, {
    wpContactId: input.portal.contact_id,
    wpOrganisationId: input.portal.organisation_id,
    purchaseLabel: input.portal.purchase_label,
  });

  const orgUpdates: {
    name?: string;
    industry?: string;
    settings: InputJsonValue;
  } = {
    settings: {
      ...settings,
      profile,
    } as unknown as InputJsonValue,
  };

  const businessName = profile.businessName?.trim();
  if (businessName && (isAutoOrgName(org.name) || org.name === input.organisationName)) {
    orgUpdates.name = businessName;
  }

  if (profile.industryVertical && !org.industry) {
    orgUpdates.industry = profile.industryVertical;
  }

  const hasConfiguredApps = Array.isArray(settings.apps?.enabled) && settings.apps.enabled.length > 0;
  if (
    !hasConfiguredApps &&
    profile.platformTier &&
    (profile.purchasedApps?.length || profile.purchasedPremium?.length)
  ) {
    const enabled = appIdsFromPlanSelection({
      platformTier: profile.platformTier,
      industryApps: profile.purchasedApps ?? [],
      premiumApps: profile.purchasedPremium ?? [],
    });
    orgUpdates.settings = {
      ...settings,
      profile,
      apps: {
        ...settings.apps,
        enabled,
        planPreview: {
          platformTier: profile.platformTier,
          industryApps: profile.purchasedApps ?? [],
          premiumApps: profile.purchasedPremium ?? [],
          appliedAt: profile.syncedAt,
          source: "onboarding_sync",
        },
      },
    } as unknown as InputJsonValue;
  }

  await prisma.organisation.update({
    where: { id: input.organisationId },
    data: orgUpdates,
  });

  return { synced: true, profile };
}

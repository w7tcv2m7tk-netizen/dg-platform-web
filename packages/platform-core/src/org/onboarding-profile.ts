import type { PortalOnboardingProfile, PortalPurchaseProfile } from "../connectors/portal-types";
import { appIdsFromPlanSelection } from "../apps/org-apps";

export type { PortalOnboardingProfile, PortalPurchaseProfile };

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

function hasSyncableProfile(onboarding?: PortalOnboardingProfile | null, purchase?: PortalPurchaseProfile | null) {
  if (onboarding?.platform_tier) return true;
  if (purchase?.dg_platform_tier) return true;
  if ((onboarding?.purchased_apps?.length ?? 0) > 0) return true;
  if ((onboarding?.purchased_premium?.length ?? 0) > 0) return true;
  if (purchase) {
    const mapped = mapPurchaseToOnboarding(purchase);
    if ((mapped.purchased_apps?.length ?? 0) > 0) return true;
    if ((mapped.purchased_premium?.length ?? 0) > 0) return true;
  }
  return false;
}

function mapPurchaseToOnboarding(purchase: PortalPurchaseProfile): PortalOnboardingProfile {
  const profile: PortalOnboardingProfile = {
    platform_tier: purchase.dg_platform_tier || undefined,
    purchased_apps: [],
    purchased_premium: [],
    purchased_addons: [],
  };

  if (purchase.dg_category === "app" && purchase.dg_plan) {
    profile.purchased_apps = [purchase.dg_plan];
  } else if (purchase.dg_category === "premium" && purchase.dg_plan) {
    profile.purchased_premium = [purchase.dg_plan];
  } else if (purchase.dg_category === "addon" && purchase.dg_plan) {
    profile.purchased_addons = [purchase.dg_plan];
  }

  return profile;
}

function mergeOnboardingWithPurchase(
  onboarding?: PortalOnboardingProfile | null,
  purchase?: PortalPurchaseProfile | null,
): PortalOnboardingProfile {
  const base: PortalOnboardingProfile = { ...(onboarding ?? {}) };
  const fromPurchase = purchase ? mapPurchaseToOnboarding(purchase) : {};

  if (!base.platform_tier && fromPurchase.platform_tier) {
    base.platform_tier = fromPurchase.platform_tier;
  }
  if (!base.purchased_apps?.length && fromPurchase.purchased_apps?.length) {
    base.purchased_apps = fromPurchase.purchased_apps;
  }
  if (!base.purchased_premium?.length && fromPurchase.purchased_premium?.length) {
    base.purchased_premium = fromPurchase.purchased_premium;
  }
  if (!base.purchased_addons?.length && fromPurchase.purchased_addons?.length) {
    base.purchased_addons = fromPurchase.purchased_addons;
  }

  return base;
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
    purchase?: PortalPurchaseProfile | null;
  };
  force?: boolean;
}): Promise<{ synced: boolean; profile?: OrganisationBusinessProfile }> {
  if (!process.env.DATABASE_URL) return { synced: false };
  if (!input.portal.linked) return { synced: false };

  const mergedOnboarding = mergeOnboardingWithPurchase(
    input.portal.onboarding,
    input.portal.purchase,
  );

  if (!hasSyncableProfile(input.portal.onboarding, input.portal.purchase)) {
    return { synced: false };
  }

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

  const profile = mapPortalProfile(mergedOnboarding, {
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
          source: input.portal.onboarding?.platform_tier ? "onboarding_sync" : "purchase_sync",
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

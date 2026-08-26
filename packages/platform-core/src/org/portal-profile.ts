import type { PortalOnboardingProfile, PortalPurchaseProfile } from "../connectors/portal-types";
import type { OrganisationBusinessProfile } from "./business-profile-types";

export type NeonPortalSetup = {
  account_created: boolean;
  payment_done: boolean;
  onboarding_done: boolean;
  platform_live: boolean;
};

/** Portal profile shape consumed by app shell (formerly WP `/portal/me`). */
export type NeonPortalProfile = {
  linked: boolean;
  email: string;
  name?: string;
  org_name?: string;
  purchase_label?: string;
  purchase?: PortalPurchaseProfile | null;
  clerk_user_id?: string;
  setup: NeonPortalSetup;
  onboarding?: PortalOnboardingProfile | null;
};

type OrgSettings = {
  profile?: OrganisationBusinessProfile;
  billing?: {
    subscriptionStatus?: string;
    platformExempt?: boolean;
    foundingCustomer?: boolean;
    programme?: string;
    lastCheckoutAt?: string;
  };
  apps?: { enabled?: string[] };
};

function profileToOnboarding(
  profile: OrganisationBusinessProfile | undefined,
  email: string,
): PortalOnboardingProfile | null {
  if (!profile) return null;
  const hasCore = Boolean(profile.businessName?.trim() || profile.contactName?.trim());
  if (!hasCore) return null;

  return {
    business_name: profile.businessName,
    contact_name: profile.contactName,
    contact_email: profile.contactEmail ?? email,
    contact_phone: profile.contactPhone,
    phone: profile.businessPhone,
    business_email: profile.businessEmail,
    abn: profile.abn,
    gst_number: profile.gstNumber,
    industry_license_number: profile.industryLicenseNumber,
    position: profile.position,
    street_address: profile.address?.street,
    city: profile.address?.city,
    state: profile.address?.state,
    postcode: profile.address?.postcode,
    country: profile.address?.country,
    website_url: profile.websiteUrl,
    industry_vertical: profile.industryVertical,
    platform_tier: profile.platformTier,
    purchased_apps: profile.purchasedApps,
    purchased_premium: profile.purchasedPremium,
    purchased_addons: profile.purchasedAddons,
    logo_url: profile.logoUrl,
    brand_colours: profile.brandColours,
  };
}

function purchaseFromSettings(
  profile: OrganisationBusinessProfile | undefined,
  billing: OrgSettings["billing"],
): { purchase: PortalPurchaseProfile | null; purchaseLabel: string } {
  const tier = profile?.platformTier?.trim();
  const label =
    profile?.purchaseLabel?.trim() ||
    (tier
      ? tier.charAt(0).toUpperCase() + tier.slice(1)
      : billing?.programme === "founding"
        ? "Founding Customer"
        : "");

  if (!tier && !label) {
    return { purchase: null, purchaseLabel: "" };
  }

  return {
    purchaseLabel: label,
    purchase: {
      dg_platform_tier: tier,
      purchase_label: label,
    },
  };
}

function computeSetup(input: {
  orgStatus: string;
  profile?: OrganisationBusinessProfile;
  billing?: OrgSettings["billing"];
  billingCustomerId?: string | null;
}): NeonPortalSetup {
  const billing = input.billing ?? {};
  const founding =
    billing.foundingCustomer === true ||
    ["founding", "founding_customer"].includes(String(billing.programme ?? "").toLowerCase());
  const exempt = billing.platformExempt === true;
  const sub = String(billing.subscriptionStatus ?? "").toLowerCase();
  const paid =
    exempt ||
    founding ||
    Boolean(input.billingCustomerId?.trim()) ||
    sub === "active" ||
    sub === "trialing";

  const profile = input.profile;
  const onboardingDone = Boolean(
    profile?.businessName?.trim() &&
      (profile.contactEmail?.trim() || profile.contactName?.trim()),
  );

  const platformLive =
    paid &&
    onboardingDone &&
    (input.orgStatus === "active" || founding || exempt);

  return {
    account_created: true,
    payment_done: paid,
    onboarding_done: onboardingDone,
    platform_live: platformLive,
  };
}

/**
 * Gen 2 portal identity — replaces live WP `/portal/me` for platform runtime.
 * Returns null when DATABASE_URL is unset (caller may use legacy bridge).
 */
export async function resolvePortalProfileFromNeon(input: {
  email: string;
  clerkUserId?: string;
}): Promise<NeonPortalProfile | null> {
  if (!process.env.DATABASE_URL) return null;

  const email = input.email.trim().toLowerCase();
  if (!email) {
    return {
      linked: false,
      email: input.email,
      setup: {
        account_created: true,
        payment_done: false,
        onboarding_done: false,
        platform_live: false,
      },
    };
  }

  const { prisma } = await import("@dg/database");

  const membership = input.clerkUserId
    ? await prisma.membership.findFirst({
        where: { clerkUserId: input.clerkUserId },
        include: { organisation: true },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const membershipByEmail =
    membership ??
    (await prisma.membership.findFirst({
      where: { email },
      include: { organisation: true },
      orderBy: { createdAt: "desc" },
    }));

  if (!membershipByEmail) {
    return {
      linked: false,
      email,
      clerk_user_id: input.clerkUserId,
      setup: {
        account_created: true,
        payment_done: false,
        onboarding_done: false,
        platform_live: false,
      },
    };
  }

  const org = membershipByEmail.organisation;
  const settings = (org.settings as OrgSettings | null) ?? {};
  const profile = settings.profile;
  const onboarding = profileToOnboarding(profile, email);
  const { purchase, purchaseLabel } = purchaseFromSettings(profile, settings.billing);
  const setup = computeSetup({
    orgStatus: org.status,
    profile,
    billing: settings.billing,
    billingCustomerId: org.billingCustomerId,
  });

  const displayName =
    membershipByEmail.displayName?.trim() ||
    profile?.contactName?.trim() ||
    email.split("@")[0];

  return {
    linked: true,
    email,
    name: displayName,
    org_name: org.name,
    purchase_label: purchaseLabel,
    purchase,
    clerk_user_id: input.clerkUserId ?? membershipByEmail.clerkUserId,
    setup,
    onboarding,
  };
}

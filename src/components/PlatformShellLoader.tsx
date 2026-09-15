import {
  canAccessCommandCentre,
  canAccessPartnerPortal,
  getGen2OnboardingProgress,
  getPartnerByClerkUserId,
  isDemoOrganisationId,
  isDigitalGateStaffEmail,
  resolveEntitlement,
  type PartnerType,
} from "@dg/platform-core";

import { PlatformShell } from "@/components/PlatformShell";
import { getOrgEnabledAppIdsCached, getOrgIndustrySelectionIdsCached } from "@/lib/org-apps";
import { getOrgBrandThemeCached } from "@/lib/org-brand-theme";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { getVipCustomerPreset } from "@/lib/onboarding/vip-customer-presets";

/** Server wrapper — dedupes session + enabled apps once per request. */
export async function PlatformShellLoader({
  children,
  showFloatingChat = true,
}: {
  children: React.ReactNode;
  showFloatingChat?: boolean;
}) {
  const [{ user, session, clerkUserId, email }, enabledIds, industrySelectionIds, brandTheme] =
    await Promise.all([
      getPlatformPageContext(),
      getOrgEnabledAppIdsCached(),
      getOrgIndustrySelectionIdsCached(),
      getOrgBrandThemeCached(),
    ]);

  // Public recovery entry points such as /onboarding deliberately live in the
  // shell route group so authenticated customers keep the native app chrome.
  // Signed-out visitors must not see default member navigation before login.
  if (!session) {
    return <>{children}</>;
  }

  const userName =
    user?.firstName ??
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0];

  const showCommandCentre = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });
  const isPlatformOperator = canAccessCommandCentre({
    organisationId: session.organisationId,
    role: session.role,
  });

  const staffByEmail =
    isDigitalGateStaffEmail(email) ||
    Boolean(user?.emailAddresses?.some((addr) => isDigitalGateStaffEmail(addr.emailAddress)));

  const showResellerAdmin =
    staffByEmail ||
    showCommandCentre ||
    session.organisations.some((org) =>
      canAccessCommandCentre({
        organisationId: org.organisationId,
        organisationName: org.organisationName,
        organisationSlug: org.organisationSlug,
        role: org.role,
      }),
    );

  const isDemo = await isDemoOrganisationId(session.organisationId);
  const showCommandCentreNav = showCommandCentre && !isDemo;

  let showPartnerPortal = false;
  let partnerType: PartnerType | null = null;
  if (clerkUserId && process.env.DATABASE_URL) {
    try {
      const partner = await getPartnerByClerkUserId(clerkUserId);
      showPartnerPortal = canAccessPartnerPortal(partner);
      partnerType = partner?.partnerType ?? null;
    } catch {
      showPartnerPortal = false;
    }
  }

  let billingBanner = null;
  if (process.env.DATABASE_URL && !isDemo) {
    try {
      const entitlement = await resolveEntitlement(session.organisationId);
      billingBanner = entitlement.banner.kind === "none" ? null : entitlement.banner;
    } catch {
      billingBanner = null;
    }
  }

  let vipSetupRequired = false;
  let vipSetupCompleted = true;
  if (!isDemo && process.env.DATABASE_URL) {
    try {
      const progress = await getGen2OnboardingProgress(session.organisationId);
      const preset = getVipCustomerPreset(session.organisationName);
      vipSetupRequired = Boolean(preset) || progress.vipSetup?.required === true;
      // Canonical adaptive onboarding completion is stored at the root. Legacy
      // VIP records may also carry their own completion timestamp. Either is a
      // valid completed setup and must allow the customer into the platform.
      vipSetupCompleted = Boolean(progress.completedAt || progress.vipSetup?.completedAt);
    } catch {
      // Never lock a customer out because setup readiness could not be read.
      vipSetupRequired = false;
      vipSetupCompleted = true;
    }
  }

  return (
    <PlatformShell
      enabledIds={enabledIds}
      industrySelectionIds={industrySelectionIds}
      userName={userName ?? undefined}
      showFloatingChat={showFloatingChat && !isDemo}
      showCommandCentre={showCommandCentreNav}
      isPlatformOperator={isPlatformOperator}
      showPartnerPortal={showPartnerPortal}
      showResellerAdmin={showResellerAdmin}
      partnerType={partnerType}
      membershipRole={session.role}
      permissionGrants={session.permissionGrants}
      activeOrganisationId={session.organisationId}
      activeOrganisationName={session.organisationName}
      organisations={session.organisations}
      brandTheme={brandTheme}
      isDemo={isDemo}
      billingBanner={billingBanner}
      vipSetupRequired={vipSetupRequired}
      vipSetupCompleted={vipSetupCompleted}
    >
      {children}
    </PlatformShell>
  );
}

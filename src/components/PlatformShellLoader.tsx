import {
  canAccessCommandCentre,
  canAccessPartnerPortal,
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

  // Authoritative platform-operator result, resolved server-side via
  // canAccessCommandCentre (DG_COMMAND_CENTRE_ORG_IDS allowlist / dg:staff).
  // Passed to the client so navigation filtering consumes the server decision
  // instead of re-evaluating server-only authority in the browser (which would
  // drop Command Centre after hydration).
  const isPlatformOperator = canAccessCommandCentre({
    organisationId: session.organisationId,
    role: session.role,
  });

  const staffByEmail =
    isDigitalGateStaffEmail(email) ||
    Boolean(
      user?.emailAddresses?.some((addr) => isDigitalGateStaffEmail(addr.emailAddress)),
    );

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

  // Industry floors stay on DigitalGate when staff toggle them for testing/demo.
  // Do not strip via filterEnabledAppsForOperatorOrg.

  let billingBanner = null;
  if (process.env.DATABASE_URL && !isDemo) {
    try {
      const entitlement = await resolveEntitlement(session.organisationId);
      billingBanner = entitlement.banner.kind === "none" ? null : entitlement.banner;
    } catch {
      billingBanner = null;
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
    >
      {children}
    </PlatformShell>
  );
}

import { after } from "next/server";
import {
  canAccessCommandCentre,
  canAccessPartnerPortal,
  filterEnabledAppsForOperatorOrg,
  getPartnerByClerkUserId,
  isDemoOrganisationId,
  isDigitalGateStaffEmail,
  type PartnerType,
} from "@dg/platform-core";

import { PlatformShell } from "@/components/PlatformShell";
import { getOrgEnabledAppIdsCached } from "@/lib/org-apps";
import { getOrgBrandThemeCached } from "@/lib/org-brand-theme";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";
import { getPlatformPageContext } from "@/lib/platform-page-context";

/** Server wrapper — dedupes session + enabled apps once per request. */
export async function PlatformShellLoader({
  children,
  showFloatingChat = true,
}: {
  children: React.ReactNode;
  showFloatingChat?: boolean;
}) {
  // Don't block first paint on WordPress→Postgres onboarding sync.
  after(() => {
    void ensureOrganisationOnboardingSync().catch(() => null);
  });

  const [{ user, session, clerkUserId, email }, enabledIds, brandTheme] = await Promise.all([
    getPlatformPageContext(),
    getOrgEnabledAppIdsCached(),
    getOrgBrandThemeCached(),
  ]);

  const userName =
    user?.firstName ??
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0];

  const showCommandCentre = session
    ? canAccessCommandCentre({
        organisationId: session.organisationId,
        organisationName: session.organisationName,
        organisationSlug: session.organisationSlug,
        role: session.role,
      })
    : false;

  const staffByEmail =
    isDigitalGateStaffEmail(email) ||
    Boolean(
      user?.emailAddresses?.some((addr) => isDigitalGateStaffEmail(addr.emailAddress)),
    );

  const showResellerAdmin =
    staffByEmail ||
    (session
      ? showCommandCentre ||
        session.organisations.some((org) =>
          canAccessCommandCentre({
            organisationId: org.organisationId,
            organisationName: org.organisationName,
            organisationSlug: org.organisationSlug,
            role: org.role,
          }),
        )
      : false);

  const isDemo = session ? await isDemoOrganisationId(session.organisationId) : false;
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

  const navEnabledIds = filterEnabledAppsForOperatorOrg(
    enabledIds,
    showCommandCentreNav,
  );

  return (
    <PlatformShell
      enabledIds={navEnabledIds}
      userName={userName ?? undefined}
      showFloatingChat={showFloatingChat && !isDemo}
      showCommandCentre={showCommandCentreNav}
      showPartnerPortal={showPartnerPortal}
      showResellerAdmin={showResellerAdmin}
      partnerType={partnerType}
      membershipRole={session?.role ?? "member"}
      organisationSlug={session?.organisationSlug}
      userEmail={email}
      permissionGrants={session?.permissionGrants}
      activeOrganisationId={session?.organisationId}
      activeOrganisationName={session?.organisationName}
      organisations={session?.organisations ?? []}
      brandTheme={brandTheme}
      isDemo={isDemo}
    >
      {children}
    </PlatformShell>
  );
}

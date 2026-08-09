import { after } from "next/server";
import { canAccessCommandCentre, filterEnabledAppsForOperatorOrg } from "@dg/platform-core";

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

  const [{ user, session }, enabledIds, brandTheme] = await Promise.all([
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
        organisations: session.organisations.map((o) => ({
          organisationId: o.organisationId,
          organisationName: o.organisationName,
          organisationSlug: o.organisationSlug,
        })),
      })
    : false;

  // Hide industry apps only when the *active* tenant is the DigitalGate operator org.
  const isOperatorOrg = session
    ? canAccessCommandCentre({
        organisationId: session.organisationId,
        organisationName: session.organisationName,
        organisationSlug: session.organisationSlug,
        role: session.role,
      })
    : false;

  const navEnabledIds = filterEnabledAppsForOperatorOrg(enabledIds, isOperatorOrg);

  return (
    <PlatformShell
      enabledIds={navEnabledIds}
      userName={userName ?? undefined}
      showFloatingChat={showFloatingChat}
      showCommandCentre={showCommandCentre}
      activeOrganisationId={session?.organisationId}
      activeOrganisationName={session?.organisationName}
      organisations={session?.organisations ?? []}
      brandTheme={brandTheme}
    >
      {children}
    </PlatformShell>
  );
}

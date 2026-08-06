import { PlatformShell } from "@/components/PlatformShell";
import { getOrgEnabledAppIdsCached } from "@/lib/org-apps";
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
  const [{ user }, , enabledIds] = await Promise.all([
    getPlatformPageContext(),
    ensureOrganisationOnboardingSync().catch(() => null),
    getOrgEnabledAppIdsCached(),
  ]);

  const userName =
    user?.firstName ??
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0];

  return (
    <PlatformShell
      enabledIds={enabledIds}
      userName={userName ?? undefined}
      showFloatingChat={showFloatingChat}
    >
      {children}
    </PlatformShell>
  );
}

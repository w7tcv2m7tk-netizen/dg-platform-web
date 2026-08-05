import { EnabledAppsProvider } from "@/components/platform/EnabledAppsProvider";
import { Sidebar } from "@/components/Sidebar";
import { getOrgEnabledAppIds } from "@/lib/org-apps";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";

export async function PlatformShell({ children }: { children: React.ReactNode }) {
  await ensureOrganisationOnboardingSync();
  const enabledIds = await getOrgEnabledAppIds();

  return (
    <EnabledAppsProvider initialEnabledIds={enabledIds}>
      <div className="flex min-h-full">
        <Sidebar />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </EnabledAppsProvider>
  );
}

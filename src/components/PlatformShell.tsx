import { currentUser } from "@clerk/nextjs/server";

import { EnabledAppsProvider } from "@/components/platform/EnabledAppsProvider";
import { Sidebar } from "@/components/Sidebar";
import { SupportChatWidget } from "@/components/support/SupportChatPanel";
import { getOrgEnabledAppIds } from "@/lib/org-apps";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";

export async function PlatformShell({
  children,
  showSupportChat = true,
}: {
  children: React.ReactNode;
  showSupportChat?: boolean;
}) {
  await ensureOrganisationOnboardingSync();
  const enabledIds = await getOrgEnabledAppIds();

  const user = await currentUser();
  const userName =
    user?.firstName ??
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0];

  return (
    <EnabledAppsProvider initialEnabledIds={enabledIds}>
      <div className="flex min-h-full">
        <Sidebar />
        <div className="flex flex-1 flex-col">{children}</div>
        {showSupportChat && user?.id ? (
          <SupportChatWidget userName={userName ?? undefined} />
        ) : null}
      </div>
    </EnabledAppsProvider>
  );
}

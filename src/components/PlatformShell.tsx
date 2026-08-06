import { currentUser } from "@clerk/nextjs/server";

import { EnabledAppsProvider } from "@/components/platform/EnabledAppsProvider";
import { ChatWidgetProvider } from "@/components/platform/ChatWidgetProvider";
import { Sidebar } from "@/components/Sidebar";
import { getOrgEnabledAppIds } from "@/lib/org-apps";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";

export async function PlatformShell({
  children,
  showFloatingChat = true,
}: {
  children: React.ReactNode;
  showFloatingChat?: boolean;
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
      <ChatWidgetProvider userName={userName ?? undefined} showFloatingChat={showFloatingChat}>
        <div className="flex min-h-full">
          <Sidebar />
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </ChatWidgetProvider>
    </EnabledAppsProvider>
  );
}

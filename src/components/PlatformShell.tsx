import { EnabledAppsProvider } from "@/components/platform/EnabledAppsProvider";
import { ChatWidgetProvider } from "@/components/platform/ChatWidgetProvider";
import { AppShellLayout } from "@/components/AppShellLayout";
import type { UserOrganisationSummary } from "@dg/platform-core";

export function PlatformShell({
  children,
  showFloatingChat = true,
  enabledIds,
  userName,
  showCommandCentre = false,
  activeOrganisationId,
  activeOrganisationName,
  organisations = [],
}: {
  children: React.ReactNode;
  showFloatingChat?: boolean;
  enabledIds: string[];
  userName?: string;
  showCommandCentre?: boolean;
  activeOrganisationId?: string;
  activeOrganisationName?: string;
  organisations?: UserOrganisationSummary[];
}) {
  return (
    <EnabledAppsProvider
      initialEnabledIds={enabledIds}
      showCommandCentre={showCommandCentre}
    >
      <ChatWidgetProvider userName={userName} showFloatingChat={showFloatingChat}>
        <AppShellLayout
          activeOrganisationId={activeOrganisationId}
          activeOrganisationName={activeOrganisationName}
          organisations={organisations}
        >
          {children}
        </AppShellLayout>
      </ChatWidgetProvider>
    </EnabledAppsProvider>
  );
}

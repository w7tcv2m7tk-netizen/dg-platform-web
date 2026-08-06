import { EnabledAppsProvider } from "@/components/platform/EnabledAppsProvider";
import { ChatWidgetProvider } from "@/components/platform/ChatWidgetProvider";
import { AppShellLayout } from "@/components/AppShellLayout";
import type { OrgBrandTheme, UserOrganisationSummary } from "@dg/platform-core";
import { DEFAULT_ORG_BRAND_THEME } from "@/lib/org-brand-theme";

export function PlatformShell({
  children,
  showFloatingChat = true,
  enabledIds,
  userName,
  showCommandCentre = false,
  activeOrganisationId,
  activeOrganisationName,
  organisations = [],
  brandTheme = DEFAULT_ORG_BRAND_THEME,
}: {
  children: React.ReactNode;
  showFloatingChat?: boolean;
  enabledIds: string[];
  userName?: string;
  showCommandCentre?: boolean;
  activeOrganisationId?: string;
  activeOrganisationName?: string;
  organisations?: UserOrganisationSummary[];
  brandTheme?: OrgBrandTheme;
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
          brandTheme={brandTheme}
        >
          {children}
        </AppShellLayout>
      </ChatWidgetProvider>
    </EnabledAppsProvider>
  );
}

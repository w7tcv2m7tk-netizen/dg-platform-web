import { EnabledAppsProvider } from "@/components/platform/EnabledAppsProvider";
import { AppShellLayout } from "@/components/AppShellLayout";
import type { OrgBrandTheme, UserOrganisationSummary } from "@dg/platform-core";
import { DEFAULT_ORG_BRAND_THEME } from "@/lib/brand-client";

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
      <AppShellLayout
        activeOrganisationId={activeOrganisationId}
        activeOrganisationName={activeOrganisationName}
        organisations={organisations}
        brandTheme={brandTheme}
        chatUserName={userName}
        showFloatingChat={showFloatingChat}
      >
        {children}
      </AppShellLayout>
    </EnabledAppsProvider>
  );
}

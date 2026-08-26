import { EnabledAppsProvider } from "@/components/platform/EnabledAppsProvider";
import { AppShellLayout } from "@/components/AppShellLayout";
import type { BillingBannerModel, OrgBrandTheme, UserOrganisationSummary } from "@dg/platform-core";
import { DEFAULT_ORG_BRAND_THEME } from "@/lib/brand-client";

export function PlatformShell({
  children,
  showFloatingChat = true,
  enabledIds,
  industrySelectionIds = [],
  userName,
  showCommandCentre = false,
  showPartnerPortal = false,
  showResellerAdmin = false,
  partnerType = null,
  membershipRole = "member",
  organisationSlug,
  userEmail,
  permissionGrants,
  activeOrganisationId,
  activeOrganisationName,
  organisations = [],
  brandTheme = DEFAULT_ORG_BRAND_THEME,
  isDemo = false,
  billingBanner = null,
}: {
  children: React.ReactNode;
  showFloatingChat?: boolean;
  enabledIds: string[];
  industrySelectionIds?: string[];
  userName?: string;
  showCommandCentre?: boolean;
  showPartnerPortal?: boolean;
  showResellerAdmin?: boolean;
  partnerType?: import("@dg/platform-core").PartnerType | null;
  membershipRole?: string;
  organisationSlug?: string;
  userEmail?: string;
  permissionGrants?: unknown;
  activeOrganisationId?: string;
  activeOrganisationName?: string;
  organisations?: UserOrganisationSummary[];
  brandTheme?: OrgBrandTheme;
  isDemo?: boolean;
  billingBanner?: BillingBannerModel | null;
}) {
  return (
    <EnabledAppsProvider
      initialEnabledIds={enabledIds}
      industrySelectionIds={industrySelectionIds}
      showCommandCentre={showCommandCentre}
      showPartnerPortal={showPartnerPortal}
      showResellerAdmin={showResellerAdmin}
      partnerType={partnerType}
      membershipRole={membershipRole}
      organisationSlug={organisationSlug}
      userEmail={userEmail}
      permissionGrants={permissionGrants}
    >
      <AppShellLayout
        activeOrganisationId={activeOrganisationId}
        activeOrganisationName={activeOrganisationName}
        organisations={organisations}
        brandTheme={brandTheme}
        chatUserName={userName}
        showFloatingChat={showFloatingChat}
        isDemo={isDemo}
        billingBanner={billingBanner}
      >
        {children}
      </AppShellLayout>
    </EnabledAppsProvider>
  );
}

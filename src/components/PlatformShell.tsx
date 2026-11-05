import { EnabledAppsProvider } from "@/components/platform/EnabledAppsProvider";
import { AppShellLayout } from "@/components/AppShellLayout";
import { VipSetupGate } from "@/components/onboarding/VipSetupGate";
import type { BillingBannerModel, OrgBrandTheme, UserOrganisationSummary } from "@dg/platform-core";
import { DEFAULT_ORG_BRAND_THEME } from "@/lib/brand-client";

export function PlatformShell({
  children,
  showFloatingChat = true,
  enabledIds,
  industrySelectionIds = [],
  industryEntitlementIds = [],
  premiumEntitlementKeys = [],
  financeAccessEnabled = false,
  industryUnavailableAppIds = [],
  userName,
  showCommandCentre = false,
  isPlatformOperator = false,
  subscriptionExempt = false,
  showPartnerPortal = false,
  showResellerAdmin = false,
  partnerType = null,
  membershipRole = "member",
  permissionGrants,
  activeOrganisationId,
  activeOrganisationName,
  organisations = [],
  brandTheme = DEFAULT_ORG_BRAND_THEME,
  isDemo = false,
  billingBanner = null,
  vipSetupRequired = false,
  vipSetupCompleted = true,
}: {
  children: React.ReactNode;
  showFloatingChat?: boolean;
  enabledIds: string[];
  industrySelectionIds?: string[];
  industryEntitlementIds?: string[];
  premiumEntitlementKeys?: string[];
  financeAccessEnabled?: boolean;
  industryUnavailableAppIds?: string[];
  userName?: string;
  showCommandCentre?: boolean;
  isPlatformOperator?: boolean;
  subscriptionExempt?: boolean;
  showPartnerPortal?: boolean;
  showResellerAdmin?: boolean;
  partnerType?: import("@dg/platform-core").PartnerType | null;
  membershipRole?: string;
  permissionGrants?: unknown;
  activeOrganisationId?: string;
  activeOrganisationName?: string;
  organisations?: UserOrganisationSummary[];
  brandTheme?: OrgBrandTheme;
  isDemo?: boolean;
  billingBanner?: BillingBannerModel | null;
  vipSetupRequired?: boolean;
  vipSetupCompleted?: boolean;
}) {
  return (
    <VipSetupGate required={vipSetupRequired} completed={vipSetupCompleted}>
      <EnabledAppsProvider
        initialEnabledIds={enabledIds}
        industrySelectionIds={industrySelectionIds}
        industryEntitlementIds={industryEntitlementIds}
        premiumEntitlementKeys={premiumEntitlementKeys}
        financeAccessEnabled={financeAccessEnabled}
        industryUnavailableAppIds={industryUnavailableAppIds}
        showCommandCentre={showCommandCentre}
        isPlatformOperator={isPlatformOperator}
        subscriptionExempt={subscriptionExempt}
        showPartnerPortal={showPartnerPortal}
        showResellerAdmin={showResellerAdmin}
        partnerType={partnerType}
        membershipRole={membershipRole}
        organisationId={activeOrganisationId}
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
    </VipSetupGate>
  );
}

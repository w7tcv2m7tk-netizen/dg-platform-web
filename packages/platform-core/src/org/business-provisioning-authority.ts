import { PLATFORM_COMMERCIAL_PLANS, type CommercialPlatformTier } from "../billing/commercial-catalogue";
import { capabilitiesForEntitlement, entitlementFromCommercialStatus, PLATFORM_COMMERCIAL_STATUSES, type PlatformCommercialStatus, type PlatformEntitlementLevel } from "../billing/subscription-types";

export type ProvisioningTier = CommercialPlatformTier | "enterprise";
type Authority = {
  planTier: string | null;
  status: string;
  entitlement: string;
  platformExempt: boolean;
  stripeStatus: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
};

/** Canonical DB projection only: never profile/settings, event metadata or a
 * historical tier without current commercial authority. This permits creation
 * of a distinct tenant; it does not copy a subscription or paid app access. */
export function activeBusinessProvisioningTier(authority: Authority, organisationCustomerId: string | null, now = new Date()): ProvisioningTier | null {
  const tier = authority.planTier;
  if (tier !== "enterprise" && !PLATFORM_COMMERCIAL_PLANS.some(plan => plan.id === tier)) return null;
  if (authority.platformExempt) return tier as ProvisioningTier;
  if (!PLATFORM_COMMERCIAL_STATUSES.includes(authority.status as PlatformCommercialStatus) ||
      !capabilitiesForEntitlement(entitlementFromCommercialStatus(authority.status as PlatformCommercialStatus)).canActivatePaidApps) return null;
  if (!authority.stripeSubscriptionId || !authority.stripeCustomerId || authority.stripeCustomerId !== organisationCustomerId) return null;
  if (!["FULL", "FULL_WITH_WARNING", "MOSTLY_FULL", "READ_ONLY", "NONE"].includes(authority.entitlement) ||
      !capabilitiesForEntitlement(authority.entitlement as PlatformEntitlementLevel).canActivatePaidApps) return null;
  if (authority.stripeStatus === "trialing" && ["TRIALING", "CANCEL_AT_PERIOD_END"].includes(authority.status) && authority.trialEnd && authority.trialEnd > now) return tier as ProvisioningTier;
  if (authority.stripeStatus === "active" && ["ACTIVE", "CANCEL_AT_PERIOD_END"].includes(authority.status) && authority.currentPeriodEnd && authority.currentPeriodEnd > now) return tier as ProvisioningTier;
  if (authority.stripeStatus === "past_due" && ["PAYMENT_FAILED", "PAST_DUE"].includes(authority.status) && authority.gracePeriodEndsAt && authority.gracePeriodEndsAt > now) return tier as ProvisioningTier;
  return null;
}

export function activeBusinessLimitForTier(tier: ProvisioningTier): number | null {
  // null is deliberately preserved for explicitly provisioned Enterprise.
  if (tier === "enterprise") return null;
  return PLATFORM_COMMERCIAL_PLANS.find(plan => plan.id === tier)!.maxActiveBusinesses;
}

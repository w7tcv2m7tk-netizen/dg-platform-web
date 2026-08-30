import { getPlatformSubscriptionResult } from "./subscription-store";
import {
  buildBillingBanner,
  capabilitiesForEntitlement,
  entitlementFromCommercialStatus,
  type PlatformEntitlementCapability,
  type PlatformEntitlementLevel,
  type PlatformSubscriptionCapabilities,
} from "./subscription-types";

export type ResolvedEntitlement = {
  organisationId: string;
  level: PlatformEntitlementLevel;
  capabilities: PlatformSubscriptionCapabilities;
  commercialStatus: string | null;
  foundingCustomer: boolean;
  platformExempt: boolean;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  paymentFailedAt: Date | null;
  planTier: string | null;
  banner: ReturnType<typeof buildBillingBanner>;
  /**
   * Where this entitlement came from. `lookup_failed` means the subscription
   * could not be read and the result is a fail-closed default, not a statement
   * about the organisation's commercial standing.
   */
  source: "subscription" | "no_subscription" | "lookup_failed";
};

export async function resolveEntitlement(
  organisationId: string,
): Promise<ResolvedEntitlement> {
  const lookup = await getPlatformSubscriptionResult(organisationId);

  if (!lookup.ok) {
    // Fail closed: an unreadable subscription must not become unrestricted
    // access. Reads, exports and billing recovery stay available so the
    // organisation is not locked out of fixing the problem.
    const level: PlatformEntitlementLevel = "READ_ONLY";
    return {
      organisationId,
      level,
      capabilities: capabilitiesForEntitlement(level),
      commercialStatus: null,
      foundingCustomer: false,
      platformExempt: false,
      trialEnd: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      paymentFailedAt: null,
      planTier: null,
      banner: {
        kind: "none",
        title: "",
        body: "",
        tone: "neutral",
      },
      source: "lookup_failed",
    };
  }

  const sub = lookup.subscription;

  if (!sub) {
    // Legitimate pre-checkout state: organisations exist before they subscribe
    // (signup, trial, onboarding) and the 20260826 backfill only covers orgs
    // that already had billing settings. This is a real free/trial state, not
    // an error, so it keeps full capability.
    const level: PlatformEntitlementLevel = "FULL";
    return {
      organisationId,
      level,
      capabilities: capabilitiesForEntitlement(level),
      commercialStatus: null,
      foundingCustomer: false,
      platformExempt: false,
      trialEnd: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      paymentFailedAt: null,
      planTier: null,
      banner: { kind: "none", title: "", body: "", tone: "neutral" },
      source: "no_subscription",
    };
  }

  const foundingOrExempt = sub.foundingCustomer || sub.platformExempt;
  const level = foundingOrExempt
    ? "FULL"
    : entitlementFromCommercialStatus(sub.status, { foundingOrExempt });

  return {
    organisationId,
    level,
    capabilities: capabilitiesForEntitlement(level),
    source: "subscription" as const,
    commercialStatus: sub.status,
    foundingCustomer: sub.foundingCustomer,
    platformExempt: sub.platformExempt,
    trialEnd: sub.trialEnd,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    paymentFailedAt: sub.paymentFailedAt,
    planTier: sub.planTier,
    banner: buildBillingBanner({
      level,
      commercialStatus: sub.status,
      foundingOrExempt,
      trialEnd: sub.trialEnd,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      planTier: sub.planTier,
    }),
  };
}

export async function assertEntitlement(
  organisationId: string,
  capability: PlatformEntitlementCapability,
): Promise<
  | { ok: true; entitlement: ResolvedEntitlement }
  | { ok: false; entitlement: ResolvedEntitlement; code: string; message: string }
> {
  const entitlement = await resolveEntitlement(organisationId);
  const map: Record<PlatformEntitlementCapability, keyof PlatformSubscriptionCapabilities> =
    {
      write: "canWrite",
      activatePaidApps: "canActivatePaidApps",
      useAi: "canUseAi",
      outbound: "canOutbound",
      export: "canExport",
      billing: "canBilling",
      view: "canView",
    };
  const key = map[capability];
  if (entitlement.capabilities[key]) {
    return { ok: true, entitlement };
  }
  return {
    ok: false,
    entitlement,
    code: "entitlement_blocked",
    message: `Action blocked by subscription entitlement (${entitlement.level}): ${capability}`,
  };
}

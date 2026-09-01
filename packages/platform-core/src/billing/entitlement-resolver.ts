import {
  getPlatformSubscription,
  getPlatformSubscriptionStrict,
  type PlatformSubscriptionRow,
} from "./subscription-store";
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
};

export async function resolveEntitlement(
  organisationId: string,
): Promise<ResolvedEntitlement> {
  const sub = await getPlatformSubscription(organisationId);

  if (!sub) {
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

export type TenantWriteEntitlement =
  | { decision: "allow" }
  | { decision: "block"; reason: "read_only"; level: PlatformEntitlementLevel }
  | { decision: "block"; reason: "lookup_failed" };

/**
 * Pure write decision for a loaded subscription row (no I/O).
 *
 * - null (no subscription: pre-checkout / trial) => allow (FULL).
 * - founding / platform-exempt                   => allow (FULL).
 * - suspended / read-only (canWrite=false)       => block "read_only".
 *
 * Shares entitlementFromCommercialStatus + capabilitiesForEntitlement with
 * resolveEntitlement so the canWrite mapping remains a single source of truth.
 */
export function writeEntitlementForSubscription(
  sub: PlatformSubscriptionRow | null,
): TenantWriteEntitlement {
  if (!sub) return { decision: "allow" };
  const foundingOrExempt = sub.foundingCustomer || sub.platformExempt;
  const level = foundingOrExempt
    ? "FULL"
    : entitlementFromCommercialStatus(sub.status, { foundingOrExempt });
  return capabilitiesForEntitlement(level).canWrite
    ? { decision: "allow" }
    : { decision: "block", reason: "read_only", level };
}

/**
 * Write-side entitlement decision for a tenant organisation, used by the
 * central write-entitlement guard (H-3).
 *
 * Uses the error-propagating store fetch so a database FAILURE is
 * distinguishable from "no subscription" and fails closed ("lookup_failed"),
 * unlike resolveEntitlement which intentionally fails open for reads. The
 * fetcher is injectable for tests; production uses the strict store.
 */
export async function checkTenantWriteEntitlement(
  organisationId: string,
  fetchSubscription: (
    id: string,
  ) => Promise<PlatformSubscriptionRow | null> = getPlatformSubscriptionStrict,
): Promise<TenantWriteEntitlement> {
  let sub: PlatformSubscriptionRow | null;
  try {
    sub = await fetchSubscription(organisationId);
  } catch {
    return { decision: "block", reason: "lookup_failed" };
  }
  return writeEntitlementForSubscription(sub);
}

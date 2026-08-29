/**
 * DigitalGate platform SaaS — commercial state vs entitlement access.
 * @see docs/commerce/SUBSCRIPTION-LIFECYCLE.md
 */

export const PLATFORM_COMMERCIAL_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAYMENT_FAILED",
  "PAST_DUE",
  "RESTRICTED",
  "SUSPENDED",
  "CANCEL_AT_PERIOD_END",
  "CANCELLED",
] as const;

export type PlatformCommercialStatus = (typeof PLATFORM_COMMERCIAL_STATUSES)[number];

export const PLATFORM_ENTITLEMENT_LEVELS = [
  "FULL",
  "FULL_WITH_WARNING",
  "MOSTLY_FULL",
  "READ_ONLY",
  "NONE",
] as const;

export type PlatformEntitlementLevel = (typeof PLATFORM_ENTITLEMENT_LEVELS)[number];

export const PLATFORM_ENTITLEMENT_CAPABILITIES = [
  "write",
  "activatePaidApps",
  "useAi",
  "outbound",
  "export",
  "billing",
  "view",
] as const;

export type PlatformEntitlementCapability =
  (typeof PLATFORM_ENTITLEMENT_CAPABILITIES)[number];

/** Dunning day thresholds from paymentFailedAt (inclusive start of stage). */
export const DUNNING_DAYS = {
  pastDueFrom: 7,
  restrictedFrom: 14,
  suspendedFrom: 21,
  reminderDay3: 3,
  reminderDay7: 7,
} as const;

/**
 * Configurable trial / annual commercial settings.
 * Change trial length (14 / 21 / 28) and annual months-equivalent here —
 * do not hard-code elsewhere. Stripe checkout should read these values.
 */
export const BILLING_COMMERCIAL_CONFIG = {
  /** Free trial length in days — initially 14; may become 21 or 28. */
  trialDays: 14 as 14 | 21 | 28,
  /** Annual price ≈ this many months of monthly pricing (10 = ~16.7% effective saving). */
  annualMonthsEquivalent: 10,
  /** Effective annual discount vs 12× monthly — derived from annualMonthsEquivalent. */
  annualDiscountPercent: Math.round((1 - 10 / 12) * 10000) / 100,
  /** Settlement/clearing days before partner commission becomes withdrawable. */
  commissionSettlementDays: 7,
  /** Whether payment method is required to start a trial. */
  trialRequiresPaymentMethod: true,
  /** Whether trial converts automatically to paid at trial end. */
  trialAutoConvert: true,
} as const;

/** @deprecated Prefer BILLING_COMMERCIAL_CONFIG.trialDays */
export const TRIAL_PERIOD_DAYS = BILLING_COMMERCIAL_CONFIG.trialDays;

export const RETENTION_DAYS_AFTER_CANCEL = 90;

/** Annual list price in cents from a monthly list price (SoT annual = N months). */
export function annualPriceFromMonthlyCents(monthlyCents: number): number {
  return monthlyCents * BILLING_COMMERCIAL_CONFIG.annualMonthsEquivalent;
}

/** MRR equivalent of an annual subscription payment (for reporting only). */
export function mrrEquivalentFromAnnualCents(annualCents: number): number {
  return Math.round(annualCents / 12);
}

export type PlatformSubscriptionCapabilities = {
  canWrite: boolean;
  canActivatePaidApps: boolean;
  canUseAi: boolean;
  canOutbound: boolean;
  canExport: boolean;
  canBilling: boolean;
  canView: boolean;
};

export type BillingBannerKind =
  | "none"
  | "trial"
  | "payment_failed"
  | "past_due"
  | "restricted"
  | "suspended"
  | "cancel_at_period_end"
  | "cancelled";

export type BillingBannerModel = {
  kind: BillingBannerKind;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  tone: "neutral" | "info" | "warning" | "danger";
  trialDaysRemaining?: number;
  periodEndLabel?: string;
};

export function entitlementFromCommercialStatus(
  status: PlatformCommercialStatus,
  opts?: { foundingOrExempt?: boolean },
): PlatformEntitlementLevel {
  if (opts?.foundingOrExempt) return "FULL";
  switch (status) {
    case "TRIALING":
    case "ACTIVE":
    case "CANCEL_AT_PERIOD_END":
      return "FULL";
    case "PAYMENT_FAILED":
      return "FULL_WITH_WARNING";
    case "PAST_DUE":
    case "RESTRICTED":
      return "MOSTLY_FULL";
    case "SUSPENDED":
      return "READ_ONLY";
    case "CANCELLED":
      return "NONE";
  }
}

export function capabilitiesForEntitlement(
  level: PlatformEntitlementLevel,
): PlatformSubscriptionCapabilities {
  switch (level) {
    case "FULL":
    case "FULL_WITH_WARNING":
      return {
        canWrite: true,
        canActivatePaidApps: true,
        canUseAi: true,
        canOutbound: true,
        canExport: true,
        canBilling: true,
        canView: true,
      };
    case "MOSTLY_FULL":
      return {
        canWrite: true,
        canActivatePaidApps: false,
        canUseAi: false,
        canOutbound: true,
        canExport: true,
        canBilling: true,
        canView: true,
      };
    case "READ_ONLY":
      return {
        canWrite: false,
        canActivatePaidApps: false,
        canUseAi: false,
        canOutbound: false,
        canExport: true,
        canBilling: true,
        canView: true,
      };
    case "NONE":
      return {
        canWrite: false,
        canActivatePaidApps: false,
        canUseAi: false,
        canOutbound: false,
        canExport: false,
        canBilling: true,
        canView: false,
      };
  }
}

/**
 * Advance dunning commercial status from days since paymentFailedAt.
 * Does not change TRIALING/ACTIVE/CANCEL_* — only payment-failure ladder.
 */
export function dunningStatusForAgeDays(ageDays: number): PlatformCommercialStatus {
  if (ageDays >= DUNNING_DAYS.suspendedFrom) return "SUSPENDED";
  if (ageDays >= DUNNING_DAYS.restrictedFrom) return "RESTRICTED";
  if (ageDays >= DUNNING_DAYS.pastDueFrom) return "PAST_DUE";
  return "PAYMENT_FAILED";
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function formatAuDate(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function trialBannerTitle(days: number): string {
  if (days <= 0) return "Your DigitalGate trial has ended";
  if (days === 1) return "Your DigitalGate trial ends tomorrow";
  return `14-day trial · ${days} days remaining`;
}

export function buildBillingBanner(input: {
  level: PlatformEntitlementLevel;
  commercialStatus: string | null;
  foundingOrExempt: boolean;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  planTier: string | null;
  now?: Date;
}): BillingBannerModel {
  if (input.foundingOrExempt) {
    return { kind: "none", title: "", body: "", tone: "neutral" };
  }

  const now = input.now ?? new Date();
  const portal = "/dashboard/settings/billing";

  if (input.commercialStatus === "CANCELLED" || input.level === "NONE") {
    return {
      kind: "cancelled",
      title: "Subscription ended",
      body: "Your DigitalGate account no longer has operational access. Resolve billing or contact support — data is retained per policy.",
      ctaLabel: "Billing settings",
      ctaHref: portal,
      tone: "danger",
    };
  }

  if (input.commercialStatus === "SUSPENDED" || input.level === "READ_ONLY") {
    return {
      kind: "suspended",
      title: "Your subscription requires attention",
      body: "Your DigitalGate account is currently restricted because payment remains outstanding. You can still view and export data and update billing.",
      ctaLabel: "Resolve billing",
      ctaHref: portal,
      tone: "danger",
    };
  }

  if (
    input.commercialStatus === "RESTRICTED" ||
    input.commercialStatus === "PAST_DUE"
  ) {
    return {
      kind: input.commercialStatus === "RESTRICTED" ? "restricted" : "past_due",
      title: "Payment required",
      body: "Your DigitalGate subscription payment is still outstanding. Update your payment method to keep your account fully operational. New premium apps and AI usage are limited until resolved.",
      ctaLabel: "Update payment method",
      ctaHref: portal,
      tone: "warning",
    };
  }

  if (input.commercialStatus === "PAYMENT_FAILED") {
    return {
      kind: "payment_failed",
      title: "Payment unsuccessful",
      body: "We couldn't process your latest DigitalGate payment. Your account remains fully operational while you update your payment method.",
      ctaLabel: "Update payment method",
      ctaHref: portal,
      tone: "warning",
    };
  }

  if (
    input.commercialStatus === "CANCEL_AT_PERIOD_END" &&
    input.currentPeriodEnd
  ) {
    return {
      kind: "cancel_at_period_end",
      title: "Subscription scheduled to end",
      body: `Your DigitalGate subscription is scheduled to end on ${formatAuDate(input.currentPeriodEnd)}.`,
      ctaLabel: "Reactivate subscription",
      ctaHref: portal,
      tone: "info",
      periodEndLabel: formatAuDate(input.currentPeriodEnd),
    };
  }

  if (input.commercialStatus === "TRIALING" && input.trialEnd) {
    const days = Math.max(0, daysBetween(now, input.trialEnd) + 1);
    return {
      kind: "trial",
      title: trialBannerTitle(days),
      body: "Your DigitalGate plan will continue after your trial unless cancelled.",
      ctaLabel: "Billing settings",
      ctaHref: portal,
      tone: "info",
      trialDaysRemaining: days,
    };
  }

  return { kind: "none", title: "", body: "", tone: "neutral" };
}

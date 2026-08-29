/**
 * DigitalGate Partner & Delivery Commercial Model — CEO LOCKED
 *
 * Three economic engines (keep acquisition and delivery separate):
 * 1. Platform Revenue — DigitalGate (partners do NOT earn % of platform subscription by default)
 * 2. Acquisition Revenue — direct Founding referrers, Acquisition Partners, Acquisition Channel Managers
 * 3. Service Revenue — Delivery Partners + Delivery Channel Managers
 *
 * Commission rule: % of qualifying revenue actually received by DigitalGate.
 * The 12-month acquisition window is eligibility, not a payment schedule.
 *
 * Do not hard-code rates elsewhere — import from this module.
 */

/** Basis points — 2000 = 20% */
export const BPS = {
  /** Founding Customer direct referral — Founding 10 cohort */
  FOUNDING_10_REFERRAL: 2000,
  /** Founding Customer direct referral — Founding 100 cohort */
  FOUNDING_100_REFERRAL: 1500,
  /** Founding Customer direct referral — Founding 1,000+ cohort */
  FOUNDING_1000_REFERRAL: 1000,
  /** Standard / advocate direct referral after founding cohorts */
  STANDARD_REFERRAL: 1000,
  /** @deprecated Prefer ACQUISITION_PARTNER — legacy RESELLER alias */
  RESELLER: 2500,
  /** Canonical Acquisition Partner rate */
  ACQUISITION_PARTNER: 2500,
  /** Channel Manager direct acquisition (when they refer a customer themselves) */
  CHANNEL_MANAGER_DIRECT: 2500,
  /** Acquisition Channel Manager override on managed Acquisition Partners' qualifying revenue */
  CHANNEL_MANAGER_OVERRIDE: 500,
  DELIVERY_PARTNER: 2500,
  DELIVERY_CHANNEL_MANAGER_DIRECT: 2500,
  DELIVERY_CHANNEL_MANAGER_OVERRIDE: 500,
} as const;

/** Eligibility window for acquisition commissions — not a payout schedule */
export const COMMISSION_PERIOD_MONTHS = 12;

/**
 * Founding Customer programme — limited access / influence, NOT a recurring % discount.
 * Do not reintroduce percentage discounts without an explicit commercial decision.
 */
export const FOUNDING_CUSTOMER_BENEFITS = {
  founding_10: {
    label: "Founding 10",
    positioning: "Limited access, not discounted access",
    benefits: [
      "Founding Customer status",
      "Early access",
      "Priority onboarding",
      "Direct relationship with DigitalGate",
      "Product feedback / roadmap influence",
      "Early access to selected features",
      "Strategic reviews",
    ] as const,
  },
  founding_100: {
    label: "Founding 100",
    positioning: "Next founding cohort — exclusivity and programme benefits",
    benefits: [
      "Founding Customer status",
      "Priority onboarding",
      "Programme benefits as published at join",
    ] as const,
  },
  founding_1000: {
    label: "Founding 1,000+",
    positioning: "Scaled founding cohort — programme benefits as published",
    benefits: ["Founding Customer status", "Programme benefits as published at join"] as const,
  },
} as const;

export type FoundingCohortId = keyof typeof FOUNDING_CUSTOMER_BENEFITS;

/**
 * @deprecated Removed — Founding customers pay standard published pricing.
 * Kept as empty sentinel so accidental imports fail closed (0% / 0 months).
 */
export const FOUNDING_CUSTOMER_DISCOUNT = {
  founding_10: { percent: 0, months: 0, label: "Founding 10" },
  founding_100: { percent: 0, months: 0, label: "Founding 100" },
  founding_1000: { percent: 0, months: 0, label: "Founding 1,000" },
} as const;

/** Direct Founding Customer referral rates by cohort — NOT Acquisition Partner rates */
export const FOUNDING_COHORT_REFERRAL = {
  founding_10: {
    cohortId: "founding_10" as const,
    label: "Founding 10",
    referralBps: BPS.FOUNDING_10_REFERRAL,
    referralRateLabel: "20%",
    summary:
      "Early founding cohort. Highest direct referral reward because these customers help establish the platform.",
  },
  founding_100: {
    cohortId: "founding_100" as const,
    label: "Founding 100",
    referralBps: BPS.FOUNDING_100_REFERRAL,
    referralRateLabel: "15%",
    summary: "Next expansion cohort. Lower direct referral reward as the programme matures.",
  },
  founding_1000: {
    cohortId: "founding_1000" as const,
    label: "Founding 1,000+",
    referralBps: BPS.FOUNDING_1000_REFERRAL,
    referralRateLabel: "10%",
    summary:
      "Scaled founding / growth cohort. Lower direct referral reward as scale and maturity increase.",
  },
} as const;

export function normalizeFoundingCohortId(
  raw: string | null | undefined,
): FoundingCohortId | null {
  const value = raw?.trim().toLowerCase();
  if (value === "founding_10" || value === "founding10") return "founding_10";
  if (value === "founding_100" || value === "founding100") return "founding_100";
  if (
    value === "founding_1000" ||
    value === "founding1000" ||
    value === "founding_1000_plus" ||
    value === "founding1000plus"
  ) {
    return "founding_1000";
  }
  return null;
}

/** Direct referral commission bps for a Founding cohort referrer */
export function foundingCohortReferralBps(cohortId: string | null | undefined): number {
  const normalized = normalizeFoundingCohortId(cohortId);
  if (normalized === "founding_10") return BPS.FOUNDING_10_REFERRAL;
  if (normalized === "founding_100") return BPS.FOUNDING_100_REFERRAL;
  if (normalized === "founding_1000") return BPS.FOUNDING_1000_REFERRAL;
  return BPS.STANDARD_REFERRAL;
}

/** Canonical programme names — use in UI, terms, and attribution */
export const COMMERCIAL_PROGRAMMES = {
  foundingCustomerReferral: "Founding Customer Referral Programme",
  reseller: "DigitalGate Acquisition Partner Programme",
  acquisitionPartner: "DigitalGate Acquisition Partner Programme",
  acquisitionChannelManagement: "Acquisition Channel Management",
  deliveryPartner: "Delivery Partner Programme",
  deliveryChannelManagement: "Delivery Channel Management",
} as const;

/** Canonical role names — use consistently in UI, ledger, and docs */
export const COMMERCIAL_ROLES = {
  directReferrer: "Direct Referrer",
  founding10Referrer: "Founding 10 Referrer",
  founding100Referrer: "Founding 100 Referrer",
  founding1000Referrer: "Founding 1,000+ Referrer",
  reseller: "Acquisition Partner",
  foundingReseller: "Founding Acquisition Partner",
  acquisitionPartner: "Acquisition Partner",
  foundingAcquisitionPartner: "Founding Acquisition Partner",
  acquisitionChannelManager: "Acquisition Channel Manager",
  deliveryPartner: "Delivery Partner",
  deliveryChannelManager: "Delivery Channel Manager",
  technologyPartner: "Technology Partner",
  strategicPartner: "Strategic Partner",
} as const;

export const PARTNER_ROLE_LABELS = {
  founding10Referral: "Founding 10 Referrer",
  founding100Referral: "Founding 100 Referrer",
  founding1000Referral: "Founding 1,000+ Referrer",
  reseller: "Acquisition Partner",
  foundingReseller: "Founding Acquisition Partner",
  channelManager: "Acquisition Channel Manager",
  deliveryPartner: "Delivery Partner",
  deliveryChannelManager: "Delivery Channel Manager",
  technologyPartner: "Technology Partner",
  strategicPartner: "Strategic Partner",
} as const;

/** Revenue categories for commission ledger */
export const REVENUE_TYPES = [
  "platform_subscription",
  "industry_app_subscription",
  "growth_app_subscription",
  "professional_services",
  "support_success",
] as const;
export type RevenueType = (typeof REVENUE_TYPES)[number];

/** Acquisition commission applies to these; delivery commission does NOT */
export const ACQUISITION_QUALIFYING_REVENUE = {
  includes: [
    "DigitalGate Platform subscription fees actually collected",
    "Industry App subscription fees actually collected",
    "Growth App subscription fees actually collected",
    "Qualifying recurring subscription upgrades during the original 12-month commission period",
  ],
  excludes: [
    "Professional Services",
    "Implementation and configuration services",
    "Support & Success Plans",
    "GST, taxes and government charges",
    "Refunds, chargebacks, credits and unpaid invoices",
    "Third-party costs, advertising spend and pass-through costs",
    "Payment processing fees",
    "One-off fees, hardware and third-party software",
    "Domain registration and pass-through hosting",
    "Catalogue pricing, forecast MRR, or theoretical revenue",
  ],
} as const;

/** Delivery commission applies to these; acquisition commission does NOT */
export const SERVICE_QUALIFYING_REVENUE = {
  includes: [
    "Professional Services (implementation, configuration, migration, integrations, training, etc.)",
    "Support & Success Plans (recurring service revenue)",
    "Other approved delivery services",
  ],
  excludes: [
    "Platform subscription fees",
    "Core platform fees",
    "Industry App subscription fees",
    "Growth App subscription fees",
    "GST, taxes, refunds, chargebacks and unpaid invoices",
    "Third-party pass-through costs",
  ],
} as const;

export const COMMERCIAL_MODEL_SUMMARY = {
  foundingCustomerReferral: {
    programme: COMMERCIAL_PROGRAMMES.foundingCustomerReferral,
    tiers: [
      { cohort: "Founding 10", rateBps: BPS.FOUNDING_10_REFERRAL, rateLabel: "20%" },
      { cohort: "Founding 100", rateBps: BPS.FOUNDING_100_REFERRAL, rateLabel: "15%" },
      { cohort: "Founding 1,000+", rateBps: BPS.FOUNDING_1000_REFERRAL, rateLabel: "10%" },
    ],
    earnsFrom: "Qualifying Platform + App subscription revenue actually collected",
    periodMonths: COMMISSION_PERIOD_MONTHS,
    note: "Direct customer referral — not Acquisition Partner economics. Rate is fixed by referrer cohort membership. Commission is calculated when DigitalGate receives qualifying revenue.",
  },
  reseller: {
    programme: COMMERCIAL_PROGRAMMES.acquisitionPartner,
    rateBps: BPS.ACQUISITION_PARTNER,
    rateLabel: "25%",
    earnsFrom: "Qualifying Platform + App subscription revenue actually collected",
    periodMonths: COMMISSION_PERIOD_MONTHS,
    note: "Earn 25% of qualifying Platform + App revenue actually received. The 12-month window is eligibility — commission is recognised on each qualifying payment received, not as an MRR schedule.",
  },
  channelManager: {
    programme: COMMERCIAL_PROGRAMMES.acquisitionChannelManagement,
    directRateBps: BPS.CHANNEL_MANAGER_DIRECT,
    overrideRateBps: BPS.CHANNEL_MANAGER_OVERRIDE,
    rateLabel: "25% own + 5% managed-channel override",
    earnsFrom: "Qualifying Platform + App subscription revenue actually collected",
    periodMonths: COMMISSION_PERIOD_MONTHS,
    maxCombinedBps: BPS.ACQUISITION_PARTNER + BPS.CHANNEL_MANAGER_OVERRIDE,
    note: `${bpsToPercentLabel(BPS.CHANNEL_MANAGER_OVERRIDE)} override is additive — not deducted from the Acquisition Partner's ${bpsToPercentLabel(BPS.ACQUISITION_PARTNER)}. Both recognise immediately on qualifying revenue received within the first ${COMMISSION_PERIOD_MONTHS} months.`,
  },
  deliveryPartner: {
    programme: COMMERCIAL_PROGRAMMES.deliveryPartner,
    rateBps: BPS.DELIVERY_PARTNER,
    rateLabel: "25%",
    earnsFrom: "Qualifying Professional Services + Support & Success revenue",
    platformSubscriptionCommission: false,
    note: "No Platform subscription commission. Service revenue only. Calculated on qualifying service revenue received.",
  },
  deliveryChannelManager: {
    programme: COMMERCIAL_PROGRAMMES.deliveryChannelManagement,
    directRateBps: BPS.DELIVERY_CHANNEL_MANAGER_DIRECT,
    overrideRateBps: BPS.DELIVERY_CHANNEL_MANAGER_OVERRIDE,
    rateLabel: "25% own delivery + 5% managed-delivery override",
    earnsFrom: "Qualifying Professional Services + Support & Success revenue",
    platformSubscriptionCommission: false,
    note: `${bpsToPercentLabel(BPS.DELIVERY_CHANNEL_MANAGER_OVERRIDE)} override is additive — not deducted from the Delivery Partner's ${bpsToPercentLabel(BPS.DELIVERY_PARTNER)}.`,
  },
} as const;

/**
 * Partner commission ledger payment states.
 * pending → settlement/clearing · available → withdrawable · paid → withdrawn
 */
export const COMMISSION_LEDGER_STATUSES = [
  "pending",
  "available",
  "earned",
  "approved",
  "payable",
  "paid",
  "reversed",
  "cancelled",
] as const;
export type CommissionLedgerStatus = (typeof COMMISSION_LEDGER_STATUSES)[number];

export const COMMISSION_KINDS = ["direct", "override"] as const;
export type CommissionKind = (typeof COMMISSION_KINDS)[number];

/** How a customer was acquired — drives commission rate and programme attribution */
export const ACQUISITION_SOURCES = [
  "direct",
  "founding_10_referral",
  "founding_100_referral",
  "founding_1000_referral",
  "reseller",
  "acquisition_partner",
  "channel_manager_direct",
] as const;
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

export function acquisitionCommissionBps(source: AcquisitionSource): number {
  switch (source) {
    case "founding_10_referral":
      return BPS.FOUNDING_10_REFERRAL;
    case "founding_100_referral":
      return BPS.FOUNDING_100_REFERRAL;
    case "founding_1000_referral":
      return BPS.FOUNDING_1000_REFERRAL;
    case "reseller":
    case "acquisition_partner":
    case "channel_manager_direct":
      return BPS.ACQUISITION_PARTNER;
    case "direct":
    default:
      return 0;
  }
}

export function acquisitionSourceForFoundingCohort(
  cohortId: string | null | undefined,
): AcquisitionSource {
  const normalized = normalizeFoundingCohortId(cohortId);
  if (normalized === "founding_10") return "founding_10_referral";
  if (normalized === "founding_100") return "founding_100_referral";
  if (normalized === "founding_1000") return "founding_1000_referral";
  return "direct";
}

export function bpsToPercentLabel(bps: number): string {
  const pct = bps / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

/** Core rule: commission = bps of qualifying revenue actually received. */
export function commissionFromNetCollected(
  qualifyingRevenueCents: number,
  commissionBps: number,
): number {
  return Math.round((qualifyingRevenueCents * commissionBps) / 10000);
}

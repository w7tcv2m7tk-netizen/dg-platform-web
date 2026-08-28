/**
 * DigitalGate Partner & Delivery Commercial Model — CEO LOCKED
 *
 * Three economic engines:
 * 1. Platform Revenue — DigitalGate (partners do NOT earn % of platform subscription by default)
 * 2. Acquisition Revenue — Resellers + Channel Managers (qualifying Platform + App subscriptions)
 * 3. Service Revenue — Delivery Partners + Delivery Channel Managers (Professional Services + Support & Success)
 *
 * Do not hard-code rates elsewhere — import from this module.
 */

/** Basis points — 2500 = 25% */
export const BPS = {
  FOUNDING_10_REFERRAL: 1500,
  RESELLER: 2500,
  CHANNEL_MANAGER_DIRECT: 2500,
  CHANNEL_MANAGER_OVERRIDE: 500,
  DELIVERY_PARTNER: 2500,
  DELIVERY_CHANNEL_MANAGER_DIRECT: 2500,
  DELIVERY_CHANNEL_MANAGER_OVERRIDE: 500,
} as const;

export const COMMISSION_PERIOD_MONTHS = 12;

/** Canonical role names — use consistently in UI and docs */
export const PARTNER_ROLE_LABELS = {
  founding10Referral: "Founding 10 Referral",
  reseller: "Reseller",
  channelManager: "Channel Manager",
  deliveryPartner: "Delivery Partner",
  deliveryChannelManager: "Delivery Channel Manager",
  technologyPartner: "Technology Partner",
  strategicPartner: "Strategic Partner",
} as const;

/** Revenue categories for commission ledger (Phase 2+) */
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
    "Support & Success Plans",
    "GST, taxes and government charges",
    "Refunds, chargebacks, credits and unpaid invoices",
    "Third-party costs, advertising spend and pass-through costs",
    "Payment processing fees",
    "One-off fees, hardware and third-party software",
    "Domain registration and pass-through hosting",
  ],
} as const;

/** Delivery commission applies to these; acquisition commission does NOT */
export const SERVICE_QUALIFYING_REVENUE = {
  includes: [
    "Professional Services (implementation, configuration, migration, integrations, training, etc.)",
    "Support & Success Plans (recurring service revenue)",
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
  founding10Referral: {
    rateBps: BPS.FOUNDING_10_REFERRAL,
    rateLabel: "15%",
    earnsFrom: "Qualifying Platform + App subscription revenue",
    periodMonths: COMMISSION_PERIOD_MONTHS,
    note: "Simple introduction/referral in Founding 10 — not full Reseller economics.",
  },
  reseller: {
    rateBps: BPS.RESELLER,
    rateLabel: "25%",
    earnsFrom: "Qualifying Platform + App subscription revenue",
    periodMonths: COMMISSION_PERIOD_MONTHS,
    note: "Month 13+ commission = $0 unless a future programme changes this.",
  },
  channelManager: {
    directRateBps: BPS.CHANNEL_MANAGER_DIRECT,
    overrideRateBps: BPS.CHANNEL_MANAGER_OVERRIDE,
    rateLabel: "25% own + 5% managed-channel override",
    earnsFrom: "Qualifying Platform + App subscription revenue",
    periodMonths: COMMISSION_PERIOD_MONTHS,
    maxCombinedBps: BPS.RESELLER + BPS.CHANNEL_MANAGER_OVERRIDE,
    note: "Override on customers from Resellers they directly manage.",
  },
  deliveryPartner: {
    rateBps: BPS.DELIVERY_PARTNER,
    rateLabel: "25%",
    earnsFrom: "Qualifying Professional Services + Support & Success revenue",
    platformSubscriptionCommission: false,
    note: "No commission on Platform subscription.",
  },
  deliveryChannelManager: {
    directRateBps: BPS.DELIVERY_CHANNEL_MANAGER_DIRECT,
    overrideRateBps: BPS.DELIVERY_CHANNEL_MANAGER_OVERRIDE,
    rateLabel: "25% own delivery + 5% managed-delivery override",
    earnsFrom: "Qualifying Professional Services + Support & Success revenue",
    platformSubscriptionCommission: false,
    digitalgateShareBeforeCosts: "70% of qualifying service revenue (before other costs)",
  },
} as const;

/** Commission event statuses for ledger (Phase 2+) */
export const COMMISSION_LEDGER_STATUSES = [
  "pending",
  "earned",
  "approved",
  "payable",
  "paid",
  "reversed",
  "cancelled",
] as const;
export type CommissionLedgerStatus = (typeof COMMISSION_LEDGER_STATUSES)[number];

/** Attribution kinds stored on commission rows */
export const COMMISSION_KINDS = ["direct", "override"] as const;
export type CommissionKind = (typeof COMMISSION_KINDS)[number];

/** How a customer was acquired — affects commission rate */
export const ACQUISITION_SOURCES = [
  "direct",
  "founding_10_referral",
  "reseller",
  "channel_manager_direct",
] as const;
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

export function acquisitionCommissionBps(source: AcquisitionSource): number {
  switch (source) {
    case "founding_10_referral":
      return BPS.FOUNDING_10_REFERRAL;
    case "reseller":
    case "channel_manager_direct":
      return BPS.RESELLER;
    case "direct":
    default:
      return 0;
  }
}

export function bpsToPercentLabel(bps: number): string {
  return `${bps / 100}%`;
}

export function commissionFromNetCollected(
  qualifyingRevenueCents: number,
  commissionBps: number,
): number {
  return Math.round((qualifyingRevenueCents * commissionBps) / 10000);
}

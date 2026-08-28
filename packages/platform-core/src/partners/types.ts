// DigitalGate Partner Programme — shared types

import {
  BPS,
  COMMISSION_PERIOD_MONTHS,
  type AcquisitionSource,
  type CommissionKind,
  type CommissionLedgerStatus,
  type RevenueType,
} from "./commercial-model";

export type {
  AcquisitionSource,
  CommissionKind,
  CommissionLedgerStatus,
  RevenueType,
};

export type PartnerType =
  | "FOUNDING_RESELLER"
  | "RESELLER"
  | "CHANNEL_MANAGER"
  | "FOUNDING_10_REFERRAL"
  | "FOUNDING_PARTNER"
  | "FOUNDING_CUSTOMER"
  | "CUSTOMER_REFERRER"
  | "IMPLEMENTATION_PARTNER"
  | "DELIVERY_CHANNEL_MANAGER"
  | "TECHNOLOGY_PARTNER"
  | "STRATEGIC_PARTNER"
  | "SUCCESS_PARTNER";

export type PartnerStatus = "pending" | "active" | "suspended" | "inactive";

export type PartnerReferralStatus =
  | "PROSPECT"
  | "INTRODUCED"
  | "CONTACTED"
  | "CONSULTATION"
  | "APPLICATION"
  | "ACCEPTED"
  | "CUSTOMER"
  | "ACTIVE"
  | "CANCELLED"
  | "DECLINED"
  /** @deprecated — mapped to INTRODUCED / PROSPECT / APPLICATION / ACTIVE / CANCELLED */
  | "INVITED"
  | "REFERRED"
  | "ONBOARDING"
  | "COMMISSIONING"
  | "CLOSED";

export type CommissionStatus =
  | "CALCULATED"
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | CommissionLedgerStatus;

export type CommissionEventType =
  | "invoice_paid"
  | "invoice_refunded"
  | "subscription_cancelled"
  | "subscription_changed"
  | "credit_applied"
  | "manual_adjustment";

export type PartnerTierConfig = {
  /** Acquisition / platform subscription commission (basis points) */
  commissionBps: number;
  /** Service revenue commission — Delivery Partners only */
  serviceCommissionBps?: number;
  /** Override on managed partners' qualifying revenue */
  overrideCommissionBps?: number;
  durationMonths: number;
  label: string;
  /** Public programme name — Founding 10 / 100 / 1,000 */
  programme: string;
  /** Seat cap for this partner channel; null = unlimited */
  seatCap: number | null;
  /** Whether this role earns platform subscription commission */
  platformSubscriptionCommission?: boolean;
};

// Commission rates by partner type (basis points) — do not hard-code elsewhere
export const PARTNER_COMMISSION_CONFIG: Record<PartnerType, PartnerTierConfig> = {
  FOUNDING_RESELLER: {
    commissionBps: BPS.RESELLER,
    durationMonths: COMMISSION_PERIOD_MONTHS,
    label: "Founding Reseller",
    programme: "Founding Resellers",
    seatCap: 10,
    platformSubscriptionCommission: true,
  },
  RESELLER: {
    commissionBps: BPS.RESELLER,
    durationMonths: COMMISSION_PERIOD_MONTHS,
    label: "Reseller",
    programme: "Reseller Programme",
    seatCap: null,
    platformSubscriptionCommission: true,
  },
  CHANNEL_MANAGER: {
    commissionBps: BPS.CHANNEL_MANAGER_DIRECT,
    overrideCommissionBps: BPS.CHANNEL_MANAGER_OVERRIDE,
    durationMonths: COMMISSION_PERIOD_MONTHS,
    label: "Channel Manager",
    programme: "Acquisition Channel",
    seatCap: null,
    platformSubscriptionCommission: true,
  },
  FOUNDING_10_REFERRAL: {
    commissionBps: BPS.FOUNDING_10_REFERRAL,
    durationMonths: COMMISSION_PERIOD_MONTHS,
    label: "Founding 10 Referral",
    programme: "Founding 10",
    seatCap: null,
    platformSubscriptionCommission: true,
  },
  FOUNDING_PARTNER: {
    commissionBps: 2500,
    durationMonths: COMMISSION_PERIOD_MONTHS,
    label: "Founding Partner",
    programme: "Founding 100",
    seatCap: 100,
    platformSubscriptionCommission: true,
  },
  FOUNDING_CUSTOMER: {
    commissionBps: 2000,
    durationMonths: COMMISSION_PERIOD_MONTHS,
    label: "Founding Customer",
    programme: "Founding 1,000",
    seatCap: 1000,
    platformSubscriptionCommission: true,
  },
  CUSTOMER_REFERRER: {
    commissionBps: 1000,
    durationMonths: COMMISSION_PERIOD_MONTHS,
    label: "Customer Referrer",
    programme: "Standard",
    seatCap: null,
    platformSubscriptionCommission: true,
  },
  IMPLEMENTATION_PARTNER: {
    commissionBps: 0,
    serviceCommissionBps: BPS.DELIVERY_PARTNER,
    durationMonths: 0,
    label: "Delivery Partner",
    programme: "DigitalGate Delivery",
    seatCap: 3,
    platformSubscriptionCommission: false,
  },
  DELIVERY_CHANNEL_MANAGER: {
    commissionBps: 0,
    serviceCommissionBps: BPS.DELIVERY_CHANNEL_MANAGER_DIRECT,
    overrideCommissionBps: BPS.DELIVERY_CHANNEL_MANAGER_OVERRIDE,
    durationMonths: 0,
    label: "Delivery Channel Manager",
    programme: "DigitalGate Delivery",
    seatCap: null,
    platformSubscriptionCommission: false,
  },
  TECHNOLOGY_PARTNER: {
    commissionBps: 0,
    durationMonths: 0,
    label: "Technology Partner",
    programme: "Partner Ecosystem",
    seatCap: null,
    platformSubscriptionCommission: false,
  },
  STRATEGIC_PARTNER: {
    commissionBps: 0,
    durationMonths: 0,
    label: "Strategic Partner",
    programme: "Partner Ecosystem",
    seatCap: null,
    platformSubscriptionCommission: false,
  },
  SUCCESS_PARTNER: {
    commissionBps: 0,
    durationMonths: 0,
    label: "Customer Success Partner",
    programme: "Partner Ecosystem",
    seatCap: null,
    platformSubscriptionCommission: false,
  },
};

export function bpsToPercent(bps: number): number {
  return bps / 100;
}

export function commissionFromRevenue(
  qualifyingRevenueCents: number,
  commissionBps: number,
): number {
  return Math.round((qualifyingRevenueCents * commissionBps) / 10000);
}

/**
 * Illustrative calculator only — not an earnings claim or guarantee.
 * Uses a monthly close (4 weeks) so 2 customers/week = 8 new customers/month.
 */
export function illustratePartnerCommission(input: {
  monthlySubscriptionCents: number;
  newCustomersPerWeek: number;
  commissionBps: number;
  durationMonths?: number;
}): {
  commissionPerCustomerMonthCents: number;
  commissionPerCustomerYearCents: number;
  snapshots: { month: number; newCustomers: number; active: number; monthlyCommissionCents: number }[];
  firstYearCashCents: number;
  month12RunRateCents: number;
  referredMrrCents: number;
  digitalgateRetainedYearCents: number;
} {
  const durationMonths = input.durationMonths ?? COMMISSION_PERIOD_MONTHS;
  const newPerMonth = Math.round(input.newCustomersPerWeek * 4);
  const perCustomerMonth = commissionFromRevenue(
    input.monthlySubscriptionCents,
    input.commissionBps,
  );
  const snapshots: {
    month: number;
    newCustomers: number;
    active: number;
    monthlyCommissionCents: number;
  }[] = [];
  let firstYearCashCents = 0;
  let active = 0;
  for (let month = 1; month <= durationMonths; month++) {
    active += newPerMonth;
    const monthlyCommissionCents = active * perCustomerMonth;
    firstYearCashCents += monthlyCommissionCents;
    snapshots.push({
      month,
      newCustomers: active,
      active,
      monthlyCommissionCents,
    });
  }
  const month12 = snapshots[durationMonths - 1];
  const referredMrrCents = (month12?.active ?? 0) * input.monthlySubscriptionCents;
  const partnerYearRunRate = (month12?.monthlyCommissionCents ?? 0) * 12;
  return {
    commissionPerCustomerMonthCents: perCustomerMonth,
    commissionPerCustomerYearCents: perCustomerMonth * durationMonths,
    snapshots,
    firstYearCashCents,
    month12RunRateCents: partnerYearRunRate,
    referredMrrCents,
    digitalgateRetainedYearCents: referredMrrCents * 12 - partnerYearRunRate,
  };
}

export const PARTNER_INVITATION_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "withdrawn",
] as const;
export type PartnerInvitationStatus = (typeof PARTNER_INVITATION_STATUSES)[number];

export type SerializedPartner = {
  id: string;
  clerkUserId: string | null;
  organisationId: string | null;
  partnerType: PartnerType;
  partnerTypeLabel: string;
  programme: string;
  seatCap: number | null;
  cohort: string | null;
  commissionBps: number;
  commissionPercent: number;
  serviceCommissionBps: number | null;
  serviceCommissionPercent: number | null;
  overrideCommissionBps: number | null;
  overrideCommissionPercent: number | null;
  commissionDurationMonths: number;
  /** Channel Manager or Delivery Channel Manager who manages this partner */
  managedByPartnerId: string | null;
  status: PartnerStatus;
  invitationStatus: PartnerInvitationStatus | null;
  inviteToken: string | null;
  invitedAt: string | null;
  invitedByName: string | null;
  invitationAcceptedAt: string | null;
  referralCode: string;
  referralUrl: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  /** Delivery division role — lead (manager) or member */
  deliveryRole: "lead" | "member" | null;
  notes: string | null;
  /** ISO timestamp when programme terms were accepted in-product */
  termsAcceptedAt: string | null;
  /** Version string of accepted terms */
  termsVersion: string | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedPartnerReferral = {
  id: string;
  partnerId: string;
  referralCode: string;
  businessName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  notes: string | null;
  source: "link" | "warm_introduction";
  /** founding_10_referral | reseller | channel_manager_direct | direct */
  acquisitionSource: AcquisitionSource | null;
  status: PartnerReferralStatus;
  referredAt: string;
  contactedAt: string | null;
  consultationAt: string | null;
  acceptedAt: string | null;
  convertedAt: string | null;
};

export type SerializedPartnerCommission = {
  id: string;
  partnerId: string;
  referralId: string;
  businessName: string | null;
  customerOrganisationId: string | null;
  subscriptionId: string | null;
  commissionBps: number;
  commissionPercent: number;
  commissionKind: CommissionKind;
  revenueType: RevenueType | null;
  sourcePartnerId: string | null;
  qualifyingRevenueCents: number;
  commissionAmountCents: number;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  status: CommissionStatus;
  approvedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  partnerName: string | null;
  createdAt: string;
};

export function partnerReferralUrl(referralCode: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://digitalgate.com.au";
  return `${base}/founding-customers/?ref=${referralCode}`;
}

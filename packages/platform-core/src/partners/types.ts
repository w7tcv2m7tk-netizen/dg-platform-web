// DigitalGate Partner Programme — shared types

export type PartnerType =
  | "FOUNDING_RESELLER"
  | "FOUNDING_PARTNER"
  | "FOUNDING_CUSTOMER"
  | "CUSTOMER_REFERRER";

export type PartnerStatus = "pending" | "active" | "suspended" | "inactive";

export type PartnerReferralStatus =
  | "INVITED"
  | "REFERRED"
  | "CONTACTED"
  | "CONSULTATION"
  | "ACCEPTED"
  | "ONBOARDING"
  | "ACTIVE"
  | "COMMISSIONING"
  | "CLOSED"
  | "DECLINED";

export type CommissionStatus = "CALCULATED" | "PENDING" | "APPROVED" | "PAID";

export type CommissionEventType =
  | "invoice_paid"
  | "invoice_refunded"
  | "subscription_cancelled"
  | "subscription_changed"
  | "credit_applied"
  | "manual_adjustment";

// Commission rates by partner type (basis points)
export const PARTNER_COMMISSION_CONFIG: Record<
  PartnerType,
  { commissionBps: number; durationMonths: number; label: string }
> = {
  FOUNDING_RESELLER: {
    commissionBps: 3000,
    durationMonths: 12,
    label: "Founding Reseller",
  },
  FOUNDING_PARTNER: {
    commissionBps: 2500,
    durationMonths: 12,
    label: "Founding Partner",
  },
  FOUNDING_CUSTOMER: {
    commissionBps: 2000,
    durationMonths: 12,
    label: "Founding Customer",
  },
  CUSTOMER_REFERRER: {
    commissionBps: 1000,
    durationMonths: 12,
    label: "Customer Referrer",
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

export type SerializedPartner = {
  id: string;
  clerkUserId: string;
  organisationId: string | null;
  partnerType: PartnerType;
  partnerTypeLabel: string;
  cohort: string | null;
  commissionBps: number;
  commissionPercent: number;
  commissionDurationMonths: number;
  status: PartnerStatus;
  referralCode: string;
  referralUrl: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  notes: string | null;
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
  qualifyingRevenueCents: number;
  commissionAmountCents: number;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  status: CommissionStatus;
  approvedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
};

export function partnerReferralUrl(referralCode: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://digitalgate.com.au";
  return `${base}/founding-customers/?ref=${referralCode}`;
}

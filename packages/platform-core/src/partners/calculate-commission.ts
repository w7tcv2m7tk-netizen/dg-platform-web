/**
 * DigitalGate commission calculation engine — single source of truth for amounts.
 *
 * Rates live in commercial-model.ts (BPS). Callers must not hard-code percentages.
 *
 * CORE RULE (CEO lock):
 * Commission = % of qualifying DigitalGate revenue actually received.
 * Calculated immediately when that payment is received — not as MRR accrual,
 * not as theoretical contract value, not as a 12-month payout schedule.
 *
 * The 12-month acquisition window is eligibility only: further qualifying
 * payments inside the window also earn commission; payments after it do not.
 *
 * Locked rates:
 * - Founding referral ladder: 20% / 15% / 10% (Platform + Apps, eligibility window)
 * - Acquisition Partner: 25%
 * - Channel Manager override: +5% additive (not deducted from partner 25%)
 * - Delivery Partner: 25% of qualifying services (no Platform commission)
 * - Delivery Channel Manager: 25% own + 5% override on managed delivery
 */

import {
  BPS,
  COMMISSION_PERIOD_MONTHS,
  acquisitionCommissionBps,
  commissionFromNetCollected,
  type AcquisitionSource,
} from "./commercial-model";

export type CommissionLine = {
  role:
    | "founding_referrer"
    | "acquisition_partner"
    | "acquisition_channel_manager"
    | "delivery_partner"
    | "delivery_channel_manager";
  commissionBps: number;
  commissionAmountCents: number;
  kind: "direct" | "override";
  /** Eligibility window in months (0 = not time-windowed, e.g. delivery services) */
  periodMonths: number;
};

export type AcquisitionCommissionResult = {
  /** Qualifying revenue this calculation is based on (the payment received) */
  qualifyingRevenueCents: number;
  periodMonths: number;
  lines: CommissionLine[];
  totalCommissionCents: number;
  digitalgateRetainedCents: number;
};

export type DeliveryCommissionResult = {
  qualifyingServiceRevenueCents: number;
  lines: CommissionLine[];
  totalCommissionCents: number;
  digitalgateRetainedCents: number;
};

/**
 * Immediate commission on a single qualifying payment received.
 * This is the production path — use for Stripe invoice.paid / annual / monthly.
 */
export function commissionOnQualifyingPayment(
  qualifyingRevenueReceivedCents: number,
  commissionBps: number,
): number {
  return commissionFromNetCollected(qualifyingRevenueReceivedCents, commissionBps);
}

/**
 * @deprecated Prefer commissionOnQualifyingPayment — name kept for callers illustrating
 * monthly × months eligibility totals (not a payout schedule).
 */
export function acquisitionPeriodCommissionCents(
  monthlyQualifyingCents: number,
  commissionBps: number,
  periodMonths: number = COMMISSION_PERIOD_MONTHS,
): number {
  return commissionOnQualifyingPayment(monthlyQualifyingCents * periodMonths, commissionBps);
}

/**
 * Founding Customer Referral — commission on one qualifying payment received.
 */
export function calculateFoundingReferralOnPayment(input: {
  qualifyingRevenueReceivedCents: number;
  cohort: "founding_10" | "founding_100" | "founding_1000";
}): AcquisitionCommissionResult {
  const source: AcquisitionSource =
    input.cohort === "founding_10"
      ? "founding_10_referral"
      : input.cohort === "founding_100"
        ? "founding_100_referral"
        : "founding_1000_referral";
  const bps = acquisitionCommissionBps(source);
  const amount = commissionOnQualifyingPayment(input.qualifyingRevenueReceivedCents, bps);
  return {
    qualifyingRevenueCents: input.qualifyingRevenueReceivedCents,
    periodMonths: COMMISSION_PERIOD_MONTHS,
    lines: [
      {
        role: "founding_referrer",
        commissionBps: bps,
        commissionAmountCents: amount,
        kind: "direct",
        periodMonths: COMMISSION_PERIOD_MONTHS,
      },
    ],
    totalCommissionCents: amount,
    digitalgateRetainedCents: input.qualifyingRevenueReceivedCents - amount,
  };
}

/**
 * Acquisition Partner (+ optional CM override) on one qualifying payment received.
 * Annual example: $5,000 received → partner $1,250 immediately (not spread over 12 months).
 */
export function calculateAcquisitionPartnerOnPayment(input: {
  qualifyingRevenueReceivedCents: number;
  withChannelManagerOverride?: boolean;
}): AcquisitionCommissionResult {
  const partnerBps = BPS.ACQUISITION_PARTNER;
  const partnerAmount = commissionOnQualifyingPayment(
    input.qualifyingRevenueReceivedCents,
    partnerBps,
  );
  const lines: CommissionLine[] = [
    {
      role: "acquisition_partner",
      commissionBps: partnerBps,
      commissionAmountCents: partnerAmount,
      kind: "direct",
      periodMonths: COMMISSION_PERIOD_MONTHS,
    },
  ];

  if (input.withChannelManagerOverride) {
    const overrideBps = BPS.CHANNEL_MANAGER_OVERRIDE;
    const overrideAmount = commissionOnQualifyingPayment(
      input.qualifyingRevenueReceivedCents,
      overrideBps,
    );
    lines.push({
      role: "acquisition_channel_manager",
      commissionBps: overrideBps,
      commissionAmountCents: overrideAmount,
      kind: "override",
      periodMonths: COMMISSION_PERIOD_MONTHS,
    });
  }

  const totalCommissionCents = lines.reduce((s, l) => s + l.commissionAmountCents, 0);
  return {
    qualifyingRevenueCents: input.qualifyingRevenueReceivedCents,
    periodMonths: COMMISSION_PERIOD_MONTHS,
    lines,
    totalCommissionCents,
    digitalgateRetainedCents: input.qualifyingRevenueReceivedCents - totalCommissionCents,
  };
}

/**
 * Illustrative eligibility total if the same monthly qualifying amount recurs for 12 months.
 * Not a payment schedule — production uses calculateAcquisitionPartnerOnPayment per receipt.
 */
export function calculateFoundingReferralCommission(input: {
  monthlyQualifyingCents: number;
  cohort: "founding_10" | "founding_100" | "founding_1000";
}): AcquisitionCommissionResult {
  return calculateFoundingReferralOnPayment({
    qualifyingRevenueReceivedCents:
      input.monthlyQualifyingCents * COMMISSION_PERIOD_MONTHS,
    cohort: input.cohort,
  });
}

export function calculateAcquisitionPartnerCommission(input: {
  monthlyQualifyingCents: number;
  withChannelManagerOverride?: boolean;
}): AcquisitionCommissionResult {
  return calculateAcquisitionPartnerOnPayment({
    qualifyingRevenueReceivedCents:
      input.monthlyQualifyingCents * COMMISSION_PERIOD_MONTHS,
    withChannelManagerOverride: input.withChannelManagerOverride,
  });
}

export function calculateChannelManagerDirectCommission(input: {
  monthlyQualifyingCents: number;
}): AcquisitionCommissionResult {
  return calculateChannelManagerDirectOnPayment({
    qualifyingRevenueReceivedCents:
      input.monthlyQualifyingCents * COMMISSION_PERIOD_MONTHS,
  });
}

export function calculateChannelManagerDirectOnPayment(input: {
  qualifyingRevenueReceivedCents: number;
}): AcquisitionCommissionResult {
  const bps = BPS.CHANNEL_MANAGER_DIRECT;
  const amount = commissionOnQualifyingPayment(input.qualifyingRevenueReceivedCents, bps);
  return {
    qualifyingRevenueCents: input.qualifyingRevenueReceivedCents,
    periodMonths: COMMISSION_PERIOD_MONTHS,
    lines: [
      {
        role: "acquisition_channel_manager",
        commissionBps: bps,
        commissionAmountCents: amount,
        kind: "direct",
        periodMonths: COMMISSION_PERIOD_MONTHS,
      },
    ],
    totalCommissionCents: amount,
    digitalgateRetainedCents: input.qualifyingRevenueReceivedCents - amount,
  };
}

/**
 * Delivery Partner — on qualifying Professional Services / Support & Success received.
 * No Platform + App subscription commission.
 */
export function calculateDeliveryPartnerCommission(input: {
  qualifyingServiceRevenueCents: number;
  withChannelManagerOverride?: boolean;
}): DeliveryCommissionResult {
  const partnerBps = BPS.DELIVERY_PARTNER;
  const partnerAmount = commissionOnQualifyingPayment(
    input.qualifyingServiceRevenueCents,
    partnerBps,
  );
  const lines: CommissionLine[] = [
    {
      role: "delivery_partner",
      commissionBps: partnerBps,
      commissionAmountCents: partnerAmount,
      kind: "direct",
      periodMonths: 0,
    },
  ];

  if (input.withChannelManagerOverride) {
    const overrideBps = BPS.DELIVERY_CHANNEL_MANAGER_OVERRIDE;
    const overrideAmount = commissionOnQualifyingPayment(
      input.qualifyingServiceRevenueCents,
      overrideBps,
    );
    lines.push({
      role: "delivery_channel_manager",
      commissionBps: overrideBps,
      commissionAmountCents: overrideAmount,
      kind: "override",
      periodMonths: 0,
    });
  }

  const totalCommissionCents = lines.reduce((s, l) => s + l.commissionAmountCents, 0);
  return {
    qualifyingServiceRevenueCents: input.qualifyingServiceRevenueCents,
    lines,
    totalCommissionCents,
    digitalgateRetainedCents: input.qualifyingServiceRevenueCents - totalCommissionCents,
  };
}

/**
 * Locked CEO examples — unit verification.
 *
 * Eligibility illustrations (monthly × 12 if same amount recurs):
 * Founding 10: $500 × 20% × 12 = $1,200
 * Founding 100: $500 × 15% × 12 = $900
 * Founding 1,000+: $500 × 10% × 12 = $600
 * Acquisition Partner: $500 × 25% × 12 = $1,500
 * + Channel Manager: $500 × 5% × 12 = $300
 *
 * Immediate payment examples:
 * Annual $5,000 → AP $1,250; + CM $250; DG $3,500
 * Delivery $2,000 → DP $500; + CM $100; DG $1,400
 */
export const LOCKED_COMMISSION_EXAMPLES = {
  monthlyQualifyingCents: 50_000,
  annualPaymentCents: 500_000,
  deliveryServiceCents: 200_000,
  founding10YearCents: 120_000,
  founding100YearCents: 90_000,
  founding1000YearCents: 60_000,
  acquisitionPartnerYearCents: 150_000,
  acquisitionChannelManagerOverrideYearCents: 30_000,
  acquisitionPartnerOnAnnualCents: 125_000,
  acquisitionChannelManagerOverrideOnAnnualCents: 25_000,
  acquisitionDigitalgateOnAnnualRetainedCents: 350_000,
  deliveryPartnerCents: 50_000,
  deliveryChannelManagerOverrideCents: 10_000,
  acquisitionDigitalgateMonthlyRetainedCents: 35_000,
  deliveryDigitalgateRetainedCents: 140_000,
} as const;

/** Throws if any locked example fails — run from scripts or CI. */
export function assertLockedCommissionExamples(): void {
  const m = LOCKED_COMMISSION_EXAMPLES.monthlyQualifyingCents;
  const annual = LOCKED_COMMISSION_EXAMPLES.annualPaymentCents;

  const f10 = calculateFoundingReferralCommission({
    monthlyQualifyingCents: m,
    cohort: "founding_10",
  });
  const f100 = calculateFoundingReferralCommission({
    monthlyQualifyingCents: m,
    cohort: "founding_100",
  });
  const f1000 = calculateFoundingReferralCommission({
    monthlyQualifyingCents: m,
    cohort: "founding_1000",
  });
  const acq = calculateAcquisitionPartnerCommission({ monthlyQualifyingCents: m });
  const acqCm = calculateAcquisitionPartnerCommission({
    monthlyQualifyingCents: m,
    withChannelManagerOverride: true,
  });
  const annualPay = calculateAcquisitionPartnerOnPayment({
    qualifyingRevenueReceivedCents: annual,
    withChannelManagerOverride: true,
  });
  const del = calculateDeliveryPartnerCommission({
    qualifyingServiceRevenueCents: LOCKED_COMMISSION_EXAMPLES.deliveryServiceCents,
  });
  const delCm = calculateDeliveryPartnerCommission({
    qualifyingServiceRevenueCents: LOCKED_COMMISSION_EXAMPLES.deliveryServiceCents,
    withChannelManagerOverride: true,
  });

  const checks: [string, number, number][] = [
    ["Founding 10 year", f10.totalCommissionCents, LOCKED_COMMISSION_EXAMPLES.founding10YearCents],
    ["Founding 100 year", f100.totalCommissionCents, LOCKED_COMMISSION_EXAMPLES.founding100YearCents],
    ["Founding 1000 year", f1000.totalCommissionCents, LOCKED_COMMISSION_EXAMPLES.founding1000YearCents],
    [
      "Acquisition Partner year",
      acq.totalCommissionCents,
      LOCKED_COMMISSION_EXAMPLES.acquisitionPartnerYearCents,
    ],
    [
      "Acquisition Partner + CM year",
      acqCm.totalCommissionCents,
      LOCKED_COMMISSION_EXAMPLES.acquisitionPartnerYearCents +
        LOCKED_COMMISSION_EXAMPLES.acquisitionChannelManagerOverrideYearCents,
    ],
    [
      "CM override alone (year)",
      acqCm.lines.find((l) => l.kind === "override")?.commissionAmountCents ?? -1,
      LOCKED_COMMISSION_EXAMPLES.acquisitionChannelManagerOverrideYearCents,
    ],
    [
      "Annual payment AP immediate",
      annualPay.lines.find((l) => l.role === "acquisition_partner")?.commissionAmountCents ?? -1,
      LOCKED_COMMISSION_EXAMPLES.acquisitionPartnerOnAnnualCents,
    ],
    [
      "Annual payment CM override immediate",
      annualPay.lines.find((l) => l.kind === "override")?.commissionAmountCents ?? -1,
      LOCKED_COMMISSION_EXAMPLES.acquisitionChannelManagerOverrideOnAnnualCents,
    ],
    [
      "Annual payment DG retained",
      annualPay.digitalgateRetainedCents,
      LOCKED_COMMISSION_EXAMPLES.acquisitionDigitalgateOnAnnualRetainedCents,
    ],
    [
      "Acquisition monthly DG retained ($350)",
      commissionFromNetCollected(m, 10000) -
        commissionFromNetCollected(m, BPS.ACQUISITION_PARTNER) -
        commissionFromNetCollected(m, BPS.CHANNEL_MANAGER_OVERRIDE),
      LOCKED_COMMISSION_EXAMPLES.acquisitionDigitalgateMonthlyRetainedCents,
    ],
    [
      "Delivery Partner",
      del.totalCommissionCents,
      LOCKED_COMMISSION_EXAMPLES.deliveryPartnerCents,
    ],
    [
      "Delivery Partner + CM",
      delCm.totalCommissionCents,
      LOCKED_COMMISSION_EXAMPLES.deliveryPartnerCents +
        LOCKED_COMMISSION_EXAMPLES.deliveryChannelManagerOverrideCents,
    ],
    [
      "Delivery DG retained ($1,400)",
      delCm.digitalgateRetainedCents,
      LOCKED_COMMISSION_EXAMPLES.deliveryDigitalgateRetainedCents,
    ],
  ];

  for (const [label, got, want] of checks) {
    if (got !== want) {
      throw new Error(`Commission SoT mismatch: ${label} got ${got} want ${want}`);
    }
  }
}

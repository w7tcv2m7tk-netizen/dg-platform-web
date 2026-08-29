/**
 * DigitalGate commission calculation engine — single source of truth for amounts.
 *
 * Rates live in commercial-model.ts (BPS). Callers must not hard-code percentages.
 * Attribution fields (customer, partner, channel manager, period, invoice) are
 * recorded by crud.ts / attribution.ts; this module computes payable amounts.
 *
 * Locked model (CEO):
 * - Founding referral ladder: 20% / 15% / 10% × 12 months (Platform + Apps)
 * - Acquisition Partner: 25% × 12 months
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
  periodMonths: number;
};

export type AcquisitionCommissionResult = {
  qualifyingRevenueCents: number;
  periodMonths: number;
  lines: CommissionLine[];
  /** Total partner + manager outgoings for the period */
  totalCommissionCents: number;
  /** DigitalGate retained after commissions */
  digitalgateRetainedCents: number;
};

export type DeliveryCommissionResult = {
  qualifyingServiceRevenueCents: number;
  lines: CommissionLine[];
  totalCommissionCents: number;
  digitalgateRetainedCents: number;
};

/** Monthly qualifying revenue × rate × months (acquisition clock). */
export function acquisitionPeriodCommissionCents(
  monthlyQualifyingCents: number,
  commissionBps: number,
  periodMonths: number = COMMISSION_PERIOD_MONTHS,
): number {
  const monthly = commissionFromNetCollected(monthlyQualifyingCents, commissionBps);
  return monthly * periodMonths;
}

/**
 * Founding Customer Referral Programme — direct referral only.
 * Not Acquisition Partner economics.
 */
export function calculateFoundingReferralCommission(input: {
  monthlyQualifyingCents: number;
  cohort: "founding_10" | "founding_100" | "founding_1000";
}): AcquisitionCommissionResult {
  const source: AcquisitionSource =
    input.cohort === "founding_10"
      ? "founding_10_referral"
      : input.cohort === "founding_100"
        ? "founding_100_referral"
        : "founding_1000_referral";
  const bps = acquisitionCommissionBps(source);
  const periodMonths = COMMISSION_PERIOD_MONTHS;
  const amount = acquisitionPeriodCommissionCents(
    input.monthlyQualifyingCents,
    bps,
    periodMonths,
  );
  const totalRevenue = input.monthlyQualifyingCents * periodMonths;
  return {
    qualifyingRevenueCents: totalRevenue,
    periodMonths,
    lines: [
      {
        role: "founding_referrer",
        commissionBps: bps,
        commissionAmountCents: amount,
        kind: "direct",
        periodMonths,
      },
    ],
    totalCommissionCents: amount,
    digitalgateRetainedCents: totalRevenue - amount,
  };
}

/**
 * Acquisition Partner commission for one referred customer over the 12-month clock.
 * Optional Channel Manager receives an additive 5% override (not deducted from 25%).
 */
export function calculateAcquisitionPartnerCommission(input: {
  monthlyQualifyingCents: number;
  /** When true, also accrue Acquisition Channel Manager override */
  withChannelManagerOverride?: boolean;
}): AcquisitionCommissionResult {
  const periodMonths = COMMISSION_PERIOD_MONTHS;
  const partnerBps = BPS.ACQUISITION_PARTNER;
  const partnerAmount = acquisitionPeriodCommissionCents(
    input.monthlyQualifyingCents,
    partnerBps,
    periodMonths,
  );
  const lines: CommissionLine[] = [
    {
      role: "acquisition_partner",
      commissionBps: partnerBps,
      commissionAmountCents: partnerAmount,
      kind: "direct",
      periodMonths,
    },
  ];

  if (input.withChannelManagerOverride) {
    const overrideBps = BPS.CHANNEL_MANAGER_OVERRIDE;
    const overrideAmount = acquisitionPeriodCommissionCents(
      input.monthlyQualifyingCents,
      overrideBps,
      periodMonths,
    );
    lines.push({
      role: "acquisition_channel_manager",
      commissionBps: overrideBps,
      commissionAmountCents: overrideAmount,
      kind: "override",
      periodMonths,
    });
  }

  const totalCommissionCents = lines.reduce((s, l) => s + l.commissionAmountCents, 0);
  const totalRevenue = input.monthlyQualifyingCents * periodMonths;
  return {
    qualifyingRevenueCents: totalRevenue,
    periodMonths,
    lines,
    totalCommissionCents,
    digitalgateRetainedCents: totalRevenue - totalCommissionCents,
  };
}

/**
 * Channel Manager referring a customer directly (own book) — 25%, no partner split.
 */
export function calculateChannelManagerDirectCommission(input: {
  monthlyQualifyingCents: number;
}): AcquisitionCommissionResult {
  const periodMonths = COMMISSION_PERIOD_MONTHS;
  const bps = BPS.CHANNEL_MANAGER_DIRECT;
  const amount = acquisitionPeriodCommissionCents(
    input.monthlyQualifyingCents,
    bps,
    periodMonths,
  );
  const totalRevenue = input.monthlyQualifyingCents * periodMonths;
  return {
    qualifyingRevenueCents: totalRevenue,
    periodMonths,
    lines: [
      {
        role: "acquisition_channel_manager",
        commissionBps: bps,
        commissionAmountCents: amount,
        kind: "direct",
        periodMonths,
      },
    ],
    totalCommissionCents: amount,
    digitalgateRetainedCents: totalRevenue - amount,
  };
}

/**
 * Delivery Partner — one-shot (or period) on qualifying Professional Services /
 * Support & Success. No Platform + App subscription commission.
 */
export function calculateDeliveryPartnerCommission(input: {
  qualifyingServiceRevenueCents: number;
  withChannelManagerOverride?: boolean;
}): DeliveryCommissionResult {
  const partnerBps = BPS.DELIVERY_PARTNER;
  const partnerAmount = commissionFromNetCollected(
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
    const overrideAmount = commissionFromNetCollected(
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
    digitalgateRetainedCents:
      input.qualifyingServiceRevenueCents - totalCommissionCents,
  };
}

/**
 * Locked CEO examples — used by unit verification. Do not change rates here;
 * change BPS in commercial-model.ts if the model changes.
 *
 * Founding 10: $500 × 20% × 12 = $1,200
 * Founding 100: $500 × 15% × 12 = $900
 * Founding 1,000+: $500 × 10% × 12 = $600
 * Acquisition Partner: $500 × 25% × 12 = $1,500
 * + Channel Manager: $500 × 5% × 12 = $300
 * Delivery Partner: $2,000 × 25% = $500
 * + Delivery CM: $2,000 × 5% = $100
 */
export const LOCKED_COMMISSION_EXAMPLES = {
  monthlyQualifyingCents: 50_000,
  deliveryServiceCents: 200_000,
  founding10YearCents: 120_000,
  founding100YearCents: 90_000,
  founding1000YearCents: 60_000,
  acquisitionPartnerYearCents: 150_000,
  acquisitionChannelManagerOverrideYearCents: 30_000,
  deliveryPartnerCents: 50_000,
  deliveryChannelManagerOverrideCents: 10_000,
  /** $500/mo with partner + CM: DG keeps $350/mo → $4,200/year */
  acquisitionDigitalgateMonthlyRetainedCents: 35_000,
  /** $2,000 service with partner + CM: DG keeps $1,400 */
  deliveryDigitalgateRetainedCents: 140_000,
} as const;

/** Throws if any locked example fails — run from scripts or CI. */
export function assertLockedCommissionExamples(): void {
  const m = LOCKED_COMMISSION_EXAMPLES.monthlyQualifyingCents;
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
      "CM override alone",
      acqCm.lines.find((l) => l.kind === "override")?.commissionAmountCents ?? -1,
      LOCKED_COMMISSION_EXAMPLES.acquisitionChannelManagerOverrideYearCents,
    ],
    [
      "Acquisition monthly DG retained ($350)",
      commissionFromNetCollected(m, 10000) -
        commissionFromNetCollected(m, BPS.RESELLER) -
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

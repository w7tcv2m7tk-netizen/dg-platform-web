/**
 * Partner Referrals workspace — attribution and commercial tracking.
 *
 * Developer rule: Referrals is NOT a second CRM or prospecting pipeline.
 * Sales / Growth Engine own DigitalGate's own opportunities.
 * This surface tracks partner-attributed introductions through to commission.
 *
 * Data chain: Partner → Referral → Organisation → Opportunity → Customer → Revenue → Commission
 */

import { listAllCommissions, listAllReferrals } from "./crud";
import { BPS, COMMISSION_PERIOD_MONTHS, bpsToPercentLabel } from "./commercial-model";
import { PARTNER_REFERRAL_STATUS_LABELS } from "./programme";
import type { PartnerReferralStatus, SerializedPartnerReferral } from "./types";

export const REFERRAL_PIPELINE_STRIP =
  "Introduced → Qualified → Discovery → Proposal → Won → Customer Live → Commission";

export const REFERRAL_PIPELINE_STAGES = [
  { id: "introduced", label: "Introduced" },
  { id: "qualified", label: "Qualified" },
  { id: "discovery", label: "Discovery" },
  { id: "proposal", label: "Proposal" },
  { id: "won", label: "Won" },
  { id: "customer_live", label: "Customer Live" },
  { id: "commission", label: "Commission" },
] as const;

export const REFERRAL_DATA_CHAIN =
  "Partner → Referral → Organisation → Opportunity → Customer → Revenue → Commission";

export const REFERRAL_AUTOMATION_VISION =
  "Acquisition Partner introduces → Referral created → Opportunity created → Customer wins → Stripe revenue appears → Commission calculated → Commission payable";

export const REFERRAL_ATTRIBUTION_RULES = [
  {
    title: "Acquisition Partner",
    bullets: [
      "Referral attributed to originating partner",
      "Commission calculated from qualifying Platform + App revenue",
      `${COMMISSION_PERIOD_MONTHS}-month commission period`,
      "Channel Manager override calculated separately where applicable",
    ],
  },
  {
    title: "Founding Customer Referrer",
    bullets: [
      `Founding 10: ${bpsToPercentLabel(BPS.FOUNDING_10_REFERRAL)}`,
      `Founding 100: ${bpsToPercentLabel(BPS.FOUNDING_100_REFERRAL)}`,
      `Founding 1,000+: ${bpsToPercentLabel(BPS.FOUNDING_1000_REFERRAL)}`,
      `First ${COMMISSION_PERIOD_MONTHS} months`,
      "Separate from Acquisition Partner status",
    ],
  },
  {
    title: "Delivery Partner",
    bullets: [
      "Service revenue attribution",
      "Professional Services",
      "Support & Success",
      "25% partner share where applicable",
      "Channel Manager override calculated separately where applicable",
    ],
  },
] as const;

const INTRODUCED = new Set<PartnerReferralStatus>([
  "PROSPECT",
  "INTRODUCED",
  "INVITED",
  "REFERRED",
]);

const QUALIFIED = new Set<PartnerReferralStatus>([
  "CONTACTED",
  "CONSULTATION",
  "APPLICATION",
  "ONBOARDING",
]);

const WON = new Set<PartnerReferralStatus>(["ACCEPTED"]);

const CUSTOMER_LIVE = new Set<PartnerReferralStatus>([
  "CUSTOMER",
  "ACTIVE",
  "COMMISSIONING",
]);

const TERMINAL = new Set<PartnerReferralStatus>(["CANCELLED", "DECLINED", "CLOSED"]);

export type ReferralPulse = {
  totalReferrals: number;
  newThisMonth: number;
  qualified: number;
  converted: number;
  customersLive: number;
  /** Scaffold until billing linkage */
  referredMrrCents: number | null;
  commissionOwingCents: number;
};

export type ReferralTableRow = {
  id: string;
  referralLabel: string;
  partnerName: string | null;
  partnerId: string;
  customerLabel: string;
  typeLabel: string;
  statusLabel: string;
  valueLabel: string;
  commissionLabel: string;
  nextAction: string;
  referredAt: string;
};

export type ReferralsWorkspace = {
  pulse: ReferralPulse;
  pipelineCounts: Array<{ id: string; label: string; count: number }>;
  rows: ReferralTableRow[];
};

function monthStartUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}

function formatAud(cents: number) {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function acquisitionTypeLabel(
  source: SerializedPartnerReferral["acquisitionSource"],
): string {
  switch (source) {
    case "founding_10_referral":
    case "founding_100_referral":
    case "founding_1000_referral":
      return "Founding Customer Referrer";
    case "channel_manager_direct":
      return "Acquisition Channel Manager";
    case "direct":
      return "Direct Referrer";
    case "reseller":
      return "Acquisition Partner";
    default:
      return "Acquisition Partner";
  }
}

function pipelineStageForStatus(status: PartnerReferralStatus): string {
  if (INTRODUCED.has(status)) return "introduced";
  if (QUALIFIED.has(status)) return "qualified";
  if (status === "CONSULTATION") return "discovery";
  if (status === "APPLICATION" || status === "ONBOARDING") return "proposal";
  if (WON.has(status)) return "won";
  if (CUSTOMER_LIVE.has(status)) return "customer_live";
  if (TERMINAL.has(status)) return "introduced";
  return "introduced";
}

function nextActionForStatus(status: PartnerReferralStatus): string {
  if (INTRODUCED.has(status)) return "Qualify introduction";
  if (status === "CONTACTED") return "Run discovery";
  if (status === "CONSULTATION") return "Prepare proposal";
  if (status === "APPLICATION" || status === "ONBOARDING") return "Close opportunity";
  if (WON.has(status)) return "Onboard customer";
  if (CUSTOMER_LIVE.has(status)) return "Track commission";
  if (TERMINAL.has(status)) return "Closed";
  return "Review";
}

export async function buildReferralsWorkspace(): Promise<ReferralsWorkspace> {
  let referrals: Awaited<ReturnType<typeof listAllReferrals>>["referrals"] = [];
  let commissions: Awaited<ReturnType<typeof listAllCommissions>>["commissions"] = [];

  try {
    const [refs, comms] = await Promise.all([
      listAllReferrals({ limit: 200 }),
      listAllCommissions({ limit: 500 }),
    ]);
    referrals = refs.referrals;
    commissions = comms.commissions;
  } catch {
    /* tables not migrated */
  }

  const monthStart = monthStartUtc();
  const activeReferrals = referrals.filter((r) => !TERMINAL.has(r.status));

  const commissionByReferral = new Map<string, number>();
  for (const c of commissions) {
    if (!["CALCULATED", "PENDING", "APPROVED"].includes(c.status)) continue;
    commissionByReferral.set(
      c.referralId,
      (commissionByReferral.get(c.referralId) ?? 0) + c.commissionAmountCents,
    );
  }

  const commissionOwingCents = commissions
    .filter((c) => ["CALCULATED", "PENDING", "APPROVED"].includes(c.status))
    .reduce((sum, c) => sum + c.commissionAmountCents, 0);

  const pipelineCounts = REFERRAL_PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: activeReferrals.filter((r) => pipelineStageForStatus(r.status) === stage.id).length,
  }));

  const rows: ReferralTableRow[] = referrals.map((r) => {
    const owing = commissionByReferral.get(r.id);
    return {
      id: r.id,
      referralLabel: r.businessName,
      partnerName: r.partnerName,
      partnerId: r.partnerId,
      customerLabel: r.contactName ?? r.businessName,
      typeLabel: acquisitionTypeLabel(r.acquisitionSource),
      statusLabel: PARTNER_REFERRAL_STATUS_LABELS[r.status] ?? r.status,
      valueLabel: "—",
      commissionLabel: owing != null && owing > 0 ? formatAud(owing) : "—",
      nextAction: nextActionForStatus(r.status),
      referredAt: r.referredAt,
    };
  });

  return {
    pulse: {
      totalReferrals: referrals.length,
      newThisMonth: referrals.filter(
        (r) => r.referredAt && new Date(r.referredAt) >= monthStart,
      ).length,
      qualified: referrals.filter((r) => QUALIFIED.has(r.status) || WON.has(r.status) || CUSTOMER_LIVE.has(r.status)).length,
      converted: referrals.filter((r) => WON.has(r.status) || CUSTOMER_LIVE.has(r.status)).length,
      customersLive: referrals.filter((r) => CUSTOMER_LIVE.has(r.status)).length,
      referredMrrCents: referrals.some((r) => CUSTOMER_LIVE.has(r.status)) ? null : 0,
      commissionOwingCents,
    },
    pipelineCounts,
    rows,
  };
}

/**
 * Platform Refer & Earn — SaaS acquisition (not B2B Network referrals).
 * See docs/foundations/REVIEWS-AND-REFERRALS.md §A.
 *
 * Hard rule: single-level only — no MLM / downlines.
 *
 * Stripe gaps (stubbed):
 * - Monthly accrual on subscription invoice.paid is not wired; first-paid
 *   credit is applied once from checkout.completed via accrueFirstPaidReward.
 * - Cash payout at ~$100 threshold is stubbed (ledger entryType cash_payout_stub).
 * - Partner 25–30% / Reseller custom rates not yet productised (commissionBps default 2000).
 */

import type { PlatformReferral, PlatformReferralLedger, Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { sendMessage } from "../communications";
import { platformEvents } from "../events";

export const REFERRAL_COOKIE = "dg_ref";
export const REFERRAL_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days
export const CUSTOMER_COMMISSION_BPS = 2000; // 20%
export const REWARD_MONTHS = 12;
/** Cash-out threshold — stubbed; credits remain default payout form. */
export const CASH_PAYOUT_THRESHOLD_CENTS = 10_000;

export const REFERRAL_STATUSES = [
  "invited",
  "signed_up",
  "trial",
  "paid",
  "rewarded",
  "churned",
] as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

const TIER_AMOUNTS_CENTS: Record<string, number> = {
  starter: 9900,
  professional: 24900,
  business: 49900,
};

function slugifyCode(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32);
}

function serializeReferral(row: PlatformReferral) {
  return {
    id: row.id,
    referrerOrganisationId: row.referrerOrganisationId,
    referredOrganisationId: row.referredOrganisationId,
    code: row.code,
    status: row.status as ReferralStatus,
    inviteEmail: row.inviteEmail,
    inviteName: row.inviteName,
    rewardMonthsRemaining: row.rewardMonthsRemaining,
    commissionBps: row.commissionBps,
    firstPaidAt: row.firstPaidAt?.toISOString() ?? null,
    rewardedUntil: row.rewardedUntil?.toISOString() ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeLedger(row: PlatformReferralLedger) {
  return {
    id: row.id,
    organisationId: row.organisationId,
    referralId: row.referralId,
    entryType: row.entryType,
    amountCents: row.amountCents,
    currency: row.currency,
    description: row.description,
    stripeRef: row.stripeRef,
    periodStart: row.periodStart?.toISOString() ?? null,
    periodEnd: row.periodEnd?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Ensure org has a shareable referral code (defaults from slug). */
export async function ensureReferralCode(organisationId: string): Promise<string> {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { id: true, slug: true, referralCode: true, name: true },
  });
  if (!org) throw new Error("Organisation not found");
  if (org.referralCode) return org.referralCode;

  let base = slugifyCode(org.slug) || slugifyCode(org.name) || "dg";
  if (base.length < 3) base = `dg${base}`;

  let code = base;
  let suffix = 0;
  while (
    await prisma.organisation.findFirst({
      where: { referralCode: code, NOT: { id: organisationId } },
    })
  ) {
    suffix += 1;
    code = `${base}${suffix}`;
  }

  await prisma.organisation.update({
    where: { id: organisationId },
    data: { referralCode: code },
  });

  return code;
}

export async function resolveReferralCode(code: string) {
  const { prisma } = await import("@dg/database");
  const normalised = slugifyCode(code);
  if (!normalised) return null;

  const org = await prisma.organisation.findFirst({
    where: { referralCode: normalised },
    select: { id: true, name: true, referralCode: true, status: true },
  });
  if (!org?.referralCode) return null;

  return {
    organisationId: org.id,
    name: org.name,
    code: org.referralCode,
    status: org.status,
  };
}

export async function getReferAndEarnDashboard(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const code = await ensureReferralCode(organisationId);

  const [referrals, ledger] = await Promise.all([
    prisma.platformReferral.findMany({
      where: { referrerOrganisationId: organisationId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.platformReferralLedger.findMany({
      where: { organisationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const invited = referrals.filter((r) => r.status === "invited").length;
  const signedUp = referrals.filter((r) =>
    ["signed_up", "trial", "paid", "rewarded"].includes(r.status),
  ).length;
  const converted = referrals.filter((r) =>
    ["paid", "rewarded"].includes(r.status),
  ).length;
  const active = referrals.filter(
    (r) =>
      ["paid", "rewarded"].includes(r.status) &&
      (r.rewardMonthsRemaining ?? 0) > 0,
  ).length;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyCredits = ledger
    .filter(
      (e) =>
        e.entryType === "credit" &&
        e.createdAt >= monthStart &&
        e.amountCents > 0,
    )
    .reduce((sum, e) => sum + e.amountCents, 0);
  const lifetimeCredits = ledger
    .filter((e) => e.entryType === "credit")
    .reduce((sum, e) => sum + e.amountCents, 0);
  const lifetimeCashStub = ledger
    .filter((e) => e.entryType === "cash_payout_stub")
    .reduce((sum, e) => sum + Math.abs(e.amountCents), 0);

  return {
    code,
    sharePath: `/r/${code}`,
    metrics: {
      invited,
      signedUp,
      converted,
      active,
      monthlyRewardCents: monthlyCredits,
      lifetimeRewardCents: lifetimeCredits,
      cashAvailableStubCents: Math.max(0, lifetimeCredits - lifetimeCashStub),
      cashPayoutThresholdCents: CASH_PAYOUT_THRESHOLD_CENTS,
    },
    referrals: referrals.map(serializeReferral),
    ledger: ledger.map(serializeLedger),
    stubs: {
      monthlyInvoiceAccrual: true,
      cashPayout: true,
      partnerRates: true,
      note:
        "Rewards: 20% of subscription × 12 months as platform credit. Cash payout and invoice.paid accrual are stubbed — see REVIEWS-AND-REFERRALS.md.",
    },
  };
}

export async function createReferralInvite(input: {
  organisationId: string;
  actorId?: string;
  email: string;
  name?: string;
  appBaseUrl: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Valid invite email required");
  }

  const { prisma } = await import("@dg/database");
  const code = await ensureReferralCode(input.organisationId);

  const existing = await prisma.platformReferral.findFirst({
    where: {
      referrerOrganisationId: input.organisationId,
      inviteEmail: email,
      referredOrganisationId: null,
    },
  });
  if (existing) {
    return { referral: serializeReferral(existing), resent: true as const };
  }

  const referral = await prisma.platformReferral.create({
    data: {
      referrerOrganisationId: input.organisationId,
      code,
      status: "invited",
      inviteEmail: email,
      inviteName: input.name?.trim() || null,
      commissionBps: CUSTOMER_COMMISSION_BPS,
      rewardMonthsRemaining: REWARD_MONTHS,
    },
  });

  const shareUrl = `${input.appBaseUrl.replace(/\/$/, "")}/r/${code}`;
  const body = [
    input.name?.trim()
      ? `Hi ${input.name.trim()},`
      : "Hi,",
    "",
    "You've been invited to try DigitalGate — the AI-powered platform for growing businesses.",
    "",
    `Sign up with this link and we'll attribute your trial to your referrer:`,
    shareUrl,
    "",
    "Your referrer earns platform credit when you become a paying customer (20% of subscription for 12 months) — single-level only, no multi-level schemes.",
  ].join("\n");

  await sendMessage({
    organisationId: input.organisationId,
    channel: "email",
    to: email,
    subject: "You're invited to DigitalGate",
    body,
    metadata: {
      footerNote: "Platform Refer & Earn invite",
      referralId: referral.id,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "PlatformReferral",
    entityId: referral.id,
    changes: { after: { inviteEmail: email, status: "invited" } },
  });

  await platformEvents.publish({
    type: "platform_referral.invited",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "PlatformReferral",
    entityId: referral.id,
    payload: { email, code },
    occurredAt: new Date(),
  });

  return { referral: serializeReferral(referral), resent: false as const };
}

/**
 * Attribute a newly provisioned org to a referrer code (first-touch; no MLM).
 * Idempotent: skips if already attributed or self-referral.
 */
export async function attributeOrganisationReferral(input: {
  organisationId: string;
  referralCode?: string | null;
  inviteEmail?: string | null;
}): Promise<{ attributed: boolean; reason?: string }> {
  const code = input.referralCode ? slugifyCode(input.referralCode) : "";
  if (!code) return { attributed: false, reason: "no_code" };

  const { prisma } = await import("@dg/database");

  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: {
      id: true,
      referredByOrganisationId: true,
      status: true,
      referralCode: true,
    },
  });
  if (!org) return { attributed: false, reason: "org_not_found" };
  if (org.referredByOrganisationId) {
    return { attributed: false, reason: "already_attributed" };
  }

  const referrer = await prisma.organisation.findFirst({
    where: { referralCode: code },
    select: { id: true, referralCode: true },
  });
  if (!referrer) return { attributed: false, reason: "code_not_found" };
  if (referrer.id === org.id) {
    return { attributed: false, reason: "self_referral" };
  }

  const email = input.inviteEmail?.trim().toLowerCase() || null;

  await prisma.organisation.update({
    where: { id: org.id },
    data: { referredByOrganisationId: referrer.id },
  });

  const existingByOrg = await prisma.platformReferral.findFirst({
    where: { referredOrganisationId: org.id },
  });
  if (existingByOrg) {
    return { attributed: true, reason: "already_linked" };
  }

  let referral = email
    ? await prisma.platformReferral.findFirst({
        where: {
          referrerOrganisationId: referrer.id,
          inviteEmail: email,
          referredOrganisationId: null,
        },
      })
    : null;

  const nextStatus: ReferralStatus =
    org.status === "trial" || org.status === "active" ? "trial" : "signed_up";

  if (referral) {
    await prisma.platformReferral.update({
      where: { id: referral.id },
      data: {
        referredOrganisationId: org.id,
        status: nextStatus,
      },
    });
  } else {
    referral = await prisma.platformReferral.create({
      data: {
        referrerOrganisationId: referrer.id,
        referredOrganisationId: org.id,
        code: referrer.referralCode ?? code,
        status: nextStatus,
        inviteEmail: email,
        commissionBps: CUSTOMER_COMMISSION_BPS,
        rewardMonthsRemaining: REWARD_MONTHS,
      },
    });
  }

  await platformEvents.publish({
    type: "platform_referral.signed_up",
    organisationId: referrer.id,
    entityType: "PlatformReferral",
    entityId: referral.id,
    payload: { referredOrganisationId: org.id, status: nextStatus },
    occurredAt: new Date(),
  });

  return { attributed: true };
}

/**
 * Mark referral paid and accrue first month of platform credit (20%).
 * Called from Stripe platform checkout provision. Monthly renewals stubbed.
 */
export async function markReferralPaidAndAccrue(input: {
  referredOrganisationId: string;
  platformTier?: string;
  stripeSessionId?: string;
  subscriptionAmountCents?: number;
}) {
  const { prisma } = await import("@dg/database");

  const org = await prisma.organisation.findUnique({
    where: { id: input.referredOrganisationId },
    select: { id: true, referredByOrganisationId: true, name: true },
  });
  if (!org?.referredByOrganisationId) {
    return { ok: false as const, reason: "not_referred" };
  }

  const referral = await prisma.platformReferral.findFirst({
    where: { referredOrganisationId: org.id },
  });
  if (!referral) {
    return { ok: false as const, reason: "referral_row_missing" };
  }

  if (["paid", "rewarded"].includes(referral.status) && referral.firstPaidAt) {
    return { ok: true as const, alreadyPaid: true, referralId: referral.id };
  }

  const amountCents =
    input.subscriptionAmountCents ??
    TIER_AMOUNTS_CENTS[input.platformTier ?? ""] ??
    TIER_AMOUNTS_CENTS.professional;
  const creditCents = Math.round(
    (amountCents * (referral.commissionBps || CUSTOMER_COMMISSION_BPS)) / 10_000,
  );

  const now = new Date();
  const rewardedUntil = new Date(now);
  rewardedUntil.setMonth(rewardedUntil.getMonth() + REWARD_MONTHS);

  await prisma.platformReferral.update({
    where: { id: referral.id },
    data: {
      status: "paid",
      firstPaidAt: now,
      rewardedUntil,
      rewardMonthsRemaining: REWARD_MONTHS - 1,
    },
  });

  await prisma.platformReferralLedger.create({
    data: {
      organisationId: referral.referrerOrganisationId,
      referralId: referral.id,
      entryType: "credit",
      amountCents: creditCents,
      currency: "AUD",
      description: `First-month referral credit (20%) — ${org.name}`,
      stripeRef: input.stripeSessionId ?? null,
      periodStart: now,
      metadata: {
        platformTier: input.platformTier,
        subscriptionAmountCents: amountCents,
        stub: "invoice.paid monthly accrual not wired",
      } as Prisma.InputJsonValue,
    },
  });

  await platformEvents.publish({
    type: "platform_referral.paid",
    organisationId: referral.referrerOrganisationId,
    entityType: "PlatformReferral",
    entityId: referral.id,
    payload: {
      referredOrganisationId: org.id,
      creditCents,
      monthsRemaining: REWARD_MONTHS - 1,
    },
    occurredAt: now,
  });

  return {
    ok: true as const,
    alreadyPaid: false,
    referralId: referral.id,
    creditCents,
  };
}

/** Stub cash payout — records ledger intent only; no Stripe Connect transfer. */
export async function requestCashPayoutStub(input: {
  organisationId: string;
  actorId?: string;
}) {
  const dash = await getReferAndEarnDashboard(input.organisationId);
  const available = dash.metrics.cashAvailableStubCents;
  if (available < CASH_PAYOUT_THRESHOLD_CENTS) {
    return {
      ok: false as const,
      reason: "below_threshold",
      availableCents: available,
      thresholdCents: CASH_PAYOUT_THRESHOLD_CENTS,
    };
  }

  const { prisma } = await import("@dg/database");
  const latest = dash.referrals[0];
  if (!latest) {
    return { ok: false as const, reason: "no_referrals" };
  }

  const entry = await prisma.platformReferralLedger.create({
    data: {
      organisationId: input.organisationId,
      referralId: latest.id,
      entryType: "cash_payout_stub",
      amountCents: -available,
      currency: "AUD",
      description:
        "Cash payout requested (STUB — Stripe Connect / bank transfer not wired)",
      metadata: {
        stub: true,
        thresholdCents: CASH_PAYOUT_THRESHOLD_CENTS,
      } as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "PlatformReferralLedger",
    entityId: entry.id,
    changes: { after: { entryType: "cash_payout_stub", amountCents: -available } },
  });

  return {
    ok: true as const,
    stub: true as const,
    amountCents: available,
    entry: serializeLedger(entry),
  };
}

/**
 * Platform Refer & Earn — SaaS acquisition (not B2B Network referrals).
 * See docs/foundations/REVIEWS-AND-REFERRALS.md §A.
 *
 * Hard rule: single-level only — no MLM / downlines.
 *
 * Stripe:
 * - First-paid credit from checkout.completed via markReferralPaidAndAccrue.
 * - Monthly renewal credit from invoice.paid (billing_reason=subscription_cycle).
 * - Cash payout at threshold via Stripe Connect Express (platform credit remains default).
 * - Partner / Reseller rates via org settings.referralProgramme.tier (customer 20%, partner 25%, reseller 30%).
 */

import type { PlatformReferral, PlatformReferralLedger, Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { sendMessage } from "../communications";
import { platformEvents } from "../events";
import {
  createReferralCashTransfer,
  getOrganisationStripeConnect,
  isStripeConnectConfigured,
} from "./stripe-connect";

export {
  STRIPE_CONNECT_ACCOUNT_TYPE,
  createStripeConnectOnboardingLink,
  getOrganisationStripeConnect,
  handleConnectAccountUpdated,
  handleConnectTransferFailure,
  isStripeConnectConfigured,
  syncStripeConnectAccount,
  type StripeConnectSnapshot,
  type StripeConnectStatus,
} from "./stripe-connect";

export const REFERRAL_COOKIE = "dg_ref";
export const REFERRAL_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days
export const CUSTOMER_COMMISSION_BPS = 2000; // 20%
export const PARTNER_COMMISSION_BPS = 2500; // 25%
export const RESELLER_COMMISSION_BPS = 3000; // 30%
export const REWARD_MONTHS = 12;
/** Cash-out threshold (AUD cents). Platform credit remains the default reward. */
export const CASH_PAYOUT_THRESHOLD_CENTS = 10_000;

const LEDGER_BALANCE_TYPES = new Set([
  "credit",
  "cash_payout",
  "cash_payout_stub",
  "cash_payout_reversal",
  "reversal",
]);

export const REFERRAL_TIERS = ["customer", "partner", "reseller"] as const;
export type ReferralTier = (typeof REFERRAL_TIERS)[number];

export const REFERRAL_TIER_BPS: Record<ReferralTier, number> = {
  customer: CUSTOMER_COMMISSION_BPS,
  partner: PARTNER_COMMISSION_BPS,
  reseller: RESELLER_COMMISSION_BPS,
};

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

type ReferralProgrammeSettings = {
  tier?: ReferralTier;
  /** Optional override — when set, used instead of tier default */
  commissionBps?: number;
};

type OrgSettingsWithReferral = {
  referralProgramme?: ReferralProgrammeSettings;
  [key: string]: unknown;
};

export function normalizeReferralTier(raw: unknown): ReferralTier {
  if (raw === "partner" || raw === "reseller" || raw === "customer") return raw;
  return "customer";
}

export function commissionBpsForTier(tier: ReferralTier, override?: number | null) {
  if (typeof override === "number" && override > 0 && override <= 5000) {
    return Math.round(override);
  }
  return REFERRAL_TIER_BPS[tier];
}

/** Resolve referrer org commission rate from settings.referralProgramme */
export async function getOrganisationReferralProgramme(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const settings = (org?.settings as OrgSettingsWithReferral | null) ?? {};
  const prog = settings.referralProgramme ?? {};
  const tier = normalizeReferralTier(prog.tier);
  const commissionBps = commissionBpsForTier(tier, prog.commissionBps);
  return {
    tier,
    commissionBps,
    label:
      tier === "partner"
        ? "Partner (25%)"
        : tier === "reseller"
          ? "Reseller (30%)"
          : "Customer (20%)",
  };
}

export async function updateOrganisationReferralProgramme(input: {
  organisationId: string;
  actorId?: string;
  tier: ReferralTier;
  commissionBps?: number | null;
}) {
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { settings: true },
  });
  if (!org) throw new Error("Organisation not found");

  const settings = (org.settings as OrgSettingsWithReferral | null) ?? {};
  const tier = normalizeReferralTier(input.tier);
  const commissionBps = commissionBpsForTier(tier, input.commissionBps);

  const next: OrgSettingsWithReferral = {
    ...settings,
    referralProgramme: {
      tier,
      ...(typeof input.commissionBps === "number"
        ? { commissionBps }
        : settings.referralProgramme?.commissionBps
          ? { commissionBps: settings.referralProgramme.commissionBps }
          : {}),
    },
  };

  // Clear override when switching tier without explicit override
  if (input.commissionBps === null) {
    delete next.referralProgramme!.commissionBps;
  }

  await prisma.organisation.update({
    where: { id: input.organisationId },
    data: { settings: next as unknown as InputJsonValue },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "Organisation",
    entityId: input.organisationId,
    changes: {
      after: { referralProgramme: next.referralProgramme },
    },
  });

  return getOrganisationReferralProgramme(input.organisationId);
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
  const [code, programme] = await Promise.all([
    ensureReferralCode(organisationId),
    getOrganisationReferralProgramme(organisationId),
  ]);

  const [referrals, ledger, allBalanceRows, monthlyAgg, lifetimeAgg] =
    await Promise.all([
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
      prisma.platformReferralLedger.findMany({
        where: {
          organisationId,
          entryType: { in: [...LEDGER_BALANCE_TYPES] },
        },
        select: { amountCents: true },
      }),
      prisma.platformReferralLedger.aggregate({
        where: {
          organisationId,
          entryType: "credit",
          amountCents: { gt: 0 },
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amountCents: true },
      }),
      prisma.platformReferralLedger.aggregate({
        where: { organisationId, entryType: "credit" },
        _sum: { amountCents: true },
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

  const monthlyCredits = monthlyAgg._sum.amountCents ?? 0;
  const lifetimeCredits = lifetimeAgg._sum.amountCents ?? 0;
  const cashAvailableCents = Math.max(
    0,
    allBalanceRows.reduce((sum, e) => sum + e.amountCents, 0),
  );

  const connect = await getOrganisationStripeConnect(organisationId);
  const connectReady = isStripeConnectConfigured();

  return {
    code,
    sharePath: `/r/${code}`,
    programme,
    connect,
    metrics: {
      invited,
      signedUp,
      converted,
      active,
      monthlyRewardCents: monthlyCredits,
      lifetimeRewardCents: lifetimeCredits,
      /** @deprecated use cashAvailableCents */
      cashAvailableStubCents: cashAvailableCents,
      cashAvailableCents,
      cashPayoutThresholdCents: CASH_PAYOUT_THRESHOLD_CENTS,
      commissionBps: programme.commissionBps,
      tier: programme.tier,
    },
    referrals: referrals.map(serializeReferral),
    ledger: ledger.map(serializeLedger),
    stubs: {
      monthlyInvoiceAccrual: false,
      cashPayout: !connectReady,
      partnerRates: false,
      note: connectReady
        ? `Rewards: ${(programme.commissionBps / 100).toFixed(0)}% of subscription × 12 months as platform credit by default (tier: ${programme.tier}). Cash bank payout via Stripe Connect Express once balance reaches the threshold and onboarding is complete. Single-level only — you earn on orgs you refer, not their referrals.`
        : `Rewards: ${(programme.commissionBps / 100).toFixed(0)}% of subscription × 12 months as platform credit (tier: ${programme.tier}). Cash bank payouts need Stripe Connect (STRIPE_CONNECT_ENABLED) — until then, rewards stay as platform credit.`,
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
  const programme = await getOrganisationReferralProgramme(input.organisationId);

  const existing = await prisma.platformReferral.findFirst({
    where: {
      referrerOrganisationId: input.organisationId,
      inviteEmail: email,
      referredOrganisationId: null,
    },
  });

  const referral =
    existing ??
    (await prisma.platformReferral.create({
      data: {
        referrerOrganisationId: input.organisationId,
        code,
        status: "invited",
        inviteEmail: email,
        inviteName: input.name?.trim() || null,
        commissionBps: programme.commissionBps,
        rewardMonthsRemaining: REWARD_MONTHS,
      },
    }));
  const resent = Boolean(existing);

  const shareUrl = `${input.appBaseUrl.replace(/\/$/, "")}/r/${code}`;
  const pct = (programme.commissionBps / 100).toFixed(0);
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
    `Your referrer earns platform credit when you become a paying customer (${pct}% of subscription for 12 months) — single-level only, no multi-level schemes.`,
  ].join("\n");

  const { composeEmailBody } = await import("../communications/email-html");
  const bodyHtml = composeEmailBody(
    [
      {
        type: "paragraph",
        text: input.name?.trim() ? `Hi ${input.name.trim()},` : "Hi,",
      },
      {
        type: "heading",
        text: "You're invited to DigitalGate",
      },
      {
        type: "paragraph",
        text: "You've been invited to try DigitalGate — the AI-powered platform for growing businesses.",
      },
      {
        type: "paragraph",
        text: "Sign up with this link and we'll attribute your trial to your referrer.",
      },
      { type: "button", label: "Accept your invite", href: shareUrl },
      {
        type: "paragraph",
        text: `Your referrer earns platform credit when you become a paying customer (${pct}% of subscription for 12 months) — single-level only, no multi-level schemes.`,
        muted: true,
      },
    ],
    { accentColor: "#3B82F6" },
  );

  const delivery = await sendMessage({
    organisationId: input.organisationId,
    channel: "email",
    to: email,
    subject: "You're invited to DigitalGate",
    body,
    bodyHtml,
    metadata: {
      footerNote: "Platform Refer & Earn invite",
      referralId: referral.id,
      purpose: "platform_referral_invite",
      ctaLabel: "Accept your invite",
      resent,
    },
  });

  if (!resent) {
    await writeAuditLog({
      organisationId: input.organisationId,
      actorId: input.actorId,
      action: "create",
      entityType: "PlatformReferral",
      entityId: referral.id,
      changes: {
        after: {
          inviteEmail: email,
          status: "invited",
          deliveryStatus: delivery.status,
          deliveryProvider: delivery.provider,
        },
      },
    });

    await platformEvents.publish({
      type: "platform_referral.invited",
      organisationId: input.organisationId,
      actorId: input.actorId,
      entityType: "PlatformReferral",
      entityId: referral.id,
      payload: {
        email,
        code,
        deliveryStatus: delivery.status,
        deliveryProvider: delivery.provider,
      },
      occurredAt: new Date(),
    });
  }

  return {
    referral: serializeReferral(referral),
    resent,
    delivery: {
      status: delivery.status,
      provider: delivery.provider,
      id: delivery.id,
      queued: delivery.status === "queued",
    },
  };
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

  const programme = await getOrganisationReferralProgramme(referrer.id);

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
        commissionBps: referral.commissionBps || programme.commissionBps,
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
        commissionBps: programme.commissionBps,
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
 * Called from Stripe platform checkout provision.
 * Months 2–12 accrue via accrueMonthlyReferralCreditFromInvoice on invoice.paid.
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
        monthIndex: 1,
        source: "checkout.completed",
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

/**
 * Accrue month 2–12 referral credit from Stripe subscription renewals.
 * Skips subscription_create (first invoice) — that credit comes from checkout.
 * Idempotent on stripe invoice id (ledger.stripeRef).
 */
export async function accrueMonthlyReferralCreditFromInvoice(input: {
  referredOrganisationId?: string | null;
  stripeCustomerId?: string | null;
  stripeInvoiceId: string;
  billingReason?: string | null;
  amountPaidCents?: number | null;
  platformTier?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}) {
  // First invoice is credited via checkout.completed — avoid double-pay.
  if (input.billingReason && input.billingReason !== "subscription_cycle") {
    return {
      ok: false as const,
      reason: "not_renewal" as const,
      billingReason: input.billingReason,
    };
  }

  const { prisma } = await import("@dg/database");

  const existing = await prisma.platformReferralLedger.findFirst({
    where: { stripeRef: input.stripeInvoiceId, entryType: "credit" },
  });
  if (existing) {
    return {
      ok: true as const,
      alreadyAccrued: true as const,
      ledgerId: existing.id,
      creditCents: existing.amountCents,
    };
  }

  let orgId = input.referredOrganisationId?.trim() || null;
  if (!orgId && input.stripeCustomerId) {
    const byCustomer = await prisma.organisation.findFirst({
      where: { billingCustomerId: input.stripeCustomerId },
      select: { id: true },
    });
    orgId = byCustomer?.id ?? null;
  }
  if (!orgId) {
    return { ok: false as const, reason: "org_not_found" as const };
  }

  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      referredByOrganisationId: true,
    },
  });
  if (!org?.referredByOrganisationId) {
    return { ok: false as const, reason: "not_referred" as const };
  }

  const referral = await prisma.platformReferral.findFirst({
    where: { referredOrganisationId: org.id },
  });
  if (!referral) {
    return { ok: false as const, reason: "referral_row_missing" as const };
  }

  if (!referral.firstPaidAt) {
    // Checkout webhook may be delayed — treat this renewal as first paid if needed.
    await markReferralPaidAndAccrue({
      referredOrganisationId: org.id,
      platformTier: input.platformTier ?? undefined,
      stripeSessionId: input.stripeInvoiceId,
      subscriptionAmountCents: input.amountPaidCents ?? undefined,
    });
    return {
      ok: true as const,
      promotedToFirstPaid: true as const,
      referralId: referral.id,
    };
  }

  const remaining = referral.rewardMonthsRemaining ?? 0;
  if (remaining <= 0 || referral.status === "rewarded") {
    if (referral.status !== "rewarded") {
      await prisma.platformReferral.update({
        where: { id: referral.id },
        data: { status: "rewarded", rewardMonthsRemaining: 0 },
      });
    }
    return { ok: false as const, reason: "window_exhausted" as const };
  }

  const amountCents =
    input.amountPaidCents && input.amountPaidCents > 0
      ? input.amountPaidCents
      : TIER_AMOUNTS_CENTS[input.platformTier ?? ""] ??
        TIER_AMOUNTS_CENTS.professional;
  const creditCents = Math.round(
    (amountCents * (referral.commissionBps || CUSTOMER_COMMISSION_BPS)) / 10_000,
  );
  const nextRemaining = remaining - 1;
  const monthIndex = REWARD_MONTHS - remaining + 1;
  const now = new Date();

  await prisma.platformReferral.update({
    where: { id: referral.id },
    data: {
      status: nextRemaining <= 0 ? "rewarded" : "paid",
      rewardMonthsRemaining: Math.max(0, nextRemaining),
    },
  });

  const ledger = await prisma.platformReferralLedger.create({
    data: {
      organisationId: referral.referrerOrganisationId,
      referralId: referral.id,
      entryType: "credit",
      amountCents: creditCents,
      currency: "AUD",
      description: `Month ${monthIndex} referral credit (20%) — ${org.name}`,
      stripeRef: input.stripeInvoiceId,
      periodStart: input.periodStart ?? now,
      periodEnd: input.periodEnd ?? null,
      metadata: {
        platformTier: input.platformTier,
        subscriptionAmountCents: amountCents,
        monthIndex,
        source: "invoice.paid",
        billingReason: input.billingReason ?? "subscription_cycle",
      } as Prisma.InputJsonValue,
    },
  });

  await platformEvents.publish({
    type: "platform_referral.credit_accrued",
    organisationId: referral.referrerOrganisationId,
    entityType: "PlatformReferral",
    entityId: referral.id,
    payload: {
      referredOrganisationId: org.id,
      creditCents,
      monthsRemaining: Math.max(0, nextRemaining),
      monthIndex,
      stripeInvoiceId: input.stripeInvoiceId,
    },
    occurredAt: now,
  });

  return {
    ok: true as const,
    alreadyAccrued: false as const,
    referralId: referral.id,
    ledgerId: ledger.id,
    creditCents,
    monthsRemaining: Math.max(0, nextRemaining),
    monthIndex,
  };
}

/**
 * Request cash payout via Stripe Connect Transfer.
 * Platform credit remains default — cash requires Connect complete + threshold.
 */
export async function requestCashPayout(input: {
  organisationId: string;
  actorId?: string;
}) {
  const dash = await getReferAndEarnDashboard(input.organisationId);
  const available = dash.metrics.cashAvailableCents;
  if (available < CASH_PAYOUT_THRESHOLD_CENTS) {
    return {
      ok: false as const,
      reason: "below_threshold" as const,
      availableCents: available,
      thresholdCents: CASH_PAYOUT_THRESHOLD_CENTS,
    };
  }

  if (!isStripeConnectConfigured()) {
    return {
      ok: false as const,
      reason: "connect_not_configured" as const,
      availableCents: available,
      thresholdCents: CASH_PAYOUT_THRESHOLD_CENTS,
      message: dash.connect.message,
    };
  }

  if (!dash.connect.canRequestPayout) {
    return {
      ok: false as const,
      reason: "connect_incomplete" as const,
      availableCents: available,
      thresholdCents: CASH_PAYOUT_THRESHOLD_CENTS,
      connect: dash.connect,
      message: dash.connect.message,
    };
  }

  const latest = dash.referrals[0];
  if (!latest) {
    return { ok: false as const, reason: "no_referrals" as const };
  }

  const { prisma } = await import("@dg/database");
  const idempotencyKey = `dg_ref_cash_${input.organisationId}_${available}_${Date.now()}`;

  let transferId: string;
  try {
    const transfer = await createReferralCashTransfer({
      organisationId: input.organisationId,
      amountCents: available,
      currency: "aud",
      idempotencyKey,
      metadata: {
        threshold_cents: String(CASH_PAYOUT_THRESHOLD_CENTS),
        actor_id: input.actorId ?? "",
      },
    });
    transferId = transfer.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transfer failed";
    return {
      ok: false as const,
      reason: "transfer_failed" as const,
      availableCents: available,
      thresholdCents: CASH_PAYOUT_THRESHOLD_CENTS,
      message,
    };
  }

  const entry = await prisma.platformReferralLedger.create({
    data: {
      organisationId: input.organisationId,
      referralId: latest.id,
      entryType: "cash_payout",
      amountCents: -available,
      currency: "AUD",
      description: "Cash payout via Stripe Connect",
      stripeRef: transferId,
      metadata: {
        thresholdCents: CASH_PAYOUT_THRESHOLD_CENTS,
        connectAccountId: dash.connect.accountId,
        idempotencyKey,
      } as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "PlatformReferralLedger",
    entityId: entry.id,
    changes: {
      after: {
        entryType: "cash_payout",
        amountCents: -available,
        stripeRef: transferId,
      },
    },
  });

  await platformEvents.publish({
    type: "platform_referral.cash_payout_requested",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "PlatformReferralLedger",
    entityId: entry.id,
    payload: {
      amountCents: available,
      transferId,
      connectAccountId: dash.connect.accountId,
    },
    occurredAt: new Date(),
  });

  return {
    ok: true as const,
    stub: false as const,
    amountCents: available,
    transferId,
    entry: serializeLedger(entry),
  };
}

/** @deprecated Use requestCashPayout — kept for older clients posting cash_payout_stub. */
export async function requestCashPayoutStub(input: {
  organisationId: string;
  actorId?: string;
}) {
  return requestCashPayout(input);
}

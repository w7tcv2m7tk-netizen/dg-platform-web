/**
 * Stripe Connect (Express) for Platform Refer & Earn cash payouts.
 *
 * Platform credit remains the default reward. Cash-out requires:
 * - STRIPE_SECRET_KEY + STRIPE_CONNECT_ENABLED=true
 * - Referrer completes Express onboarding (AU)
 * - Ledger available balance ≥ CASH_PAYOUT_THRESHOLD_CENTS
 *
 * Transfers debit the platform Stripe balance → connected Express account.
 * Single-level only — no MLM / downlines.
 */

import type { Prisma } from "@dg/database";
import Stripe from "stripe";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";

export const STRIPE_CONNECT_ACCOUNT_TYPE = "express" as const;

export type StripeConnectStatus =
  | "not_started"
  | "pending"
  | "restricted"
  | "complete"
  | "disabled";

export type StripeConnectSnapshot = {
  configured: boolean;
  accountType: typeof STRIPE_CONNECT_ACCOUNT_TYPE;
  accountId: string | null;
  status: StripeConnectStatus;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  canRequestPayout: boolean;
  message: string;
};

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(secretKey);
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim()?.replace(/^/, "https://") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** Opt-in flag — Connect UI / payouts stay clear when unset. */
export function isStripeConnectConfigured(): boolean {
  const flag = process.env.STRIPE_CONNECT_ENABLED?.trim().toLowerCase();
  if (flag !== "true" && flag !== "1" && flag !== "yes") return false;
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function connectStatusFromAccount(account: Stripe.Account): {
  status: StripeConnectStatus;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
} {
  const detailsSubmitted = Boolean(account.details_submitted);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const disabled =
    account.requirements?.disabled_reason != null &&
    account.requirements.disabled_reason.length > 0;

  let status: StripeConnectStatus = "not_started";
  if (disabled) status = "disabled";
  else if (payoutsEnabled && detailsSubmitted) status = "complete";
  else if (detailsSubmitted && !payoutsEnabled) status = "restricted";
  else if (account.id) status = "pending";

  return { status, payoutsEnabled, detailsSubmitted };
}

export async function getOrganisationStripeConnect(
  organisationId: string,
): Promise<StripeConnectSnapshot> {
  const configured = isStripeConnectConfigured();
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: {
      stripeConnectAccountId: true,
      stripeConnectStatus: true,
      stripeConnectPayoutsEnabled: true,
    },
  });

  const accountId = org?.stripeConnectAccountId ?? null;
  const status = (org?.stripeConnectStatus as StripeConnectStatus | null) ?? "not_started";
  const payoutsEnabled = Boolean(org?.stripeConnectPayoutsEnabled);

  if (!configured) {
    return {
      configured: false,
      accountType: STRIPE_CONNECT_ACCOUNT_TYPE,
      accountId,
      status: accountId ? status : "not_started",
      payoutsEnabled: false,
      detailsSubmitted: false,
      canRequestPayout: false,
      message:
        "Cash bank payouts are not enabled on this environment yet. Rewards stay as platform credit — ask your DigitalGate admin to set STRIPE_CONNECT_ENABLED.",
    };
  }

  if (!accountId) {
    return {
      configured: true,
      accountType: STRIPE_CONNECT_ACCOUNT_TYPE,
      accountId: null,
      status: "not_started",
      payoutsEnabled: false,
      detailsSubmitted: false,
      canRequestPayout: false,
      message:
        "Connect a bank account (Stripe Express) to request a cash payout once you reach the threshold. Platform credit remains available by default.",
    };
  }

  const canRequestPayout = payoutsEnabled && status === "complete";
  let message =
    "Finish Stripe Express onboarding to enable bank cash-outs. Platform credit is still your default reward.";
  if (status === "complete" && payoutsEnabled) {
    message =
      "Bank payouts are ready. Request a cash transfer when your available balance meets the threshold.";
  } else if (status === "restricted") {
    message =
      "Stripe needs more information before payouts can be enabled. Open onboarding again to resolve.";
  } else if (status === "disabled") {
    message =
      "This Connect account is disabled in Stripe. Contact support or re-start onboarding.";
  } else if (status === "pending") {
    message = "Stripe Express onboarding is in progress — return to finish your details.";
  }

  return {
    configured: true,
    accountType: STRIPE_CONNECT_ACCOUNT_TYPE,
    accountId,
    status,
    payoutsEnabled,
    detailsSubmitted: status === "complete" || status === "restricted",
    canRequestPayout,
    message,
  };
}

async function persistConnectAccount(
  organisationId: string,
  account: Stripe.Account,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");
  const derived = connectStatusFromAccount(account);

  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      stripeConnectAccountId: account.id,
      stripeConnectStatus: derived.status,
      stripeConnectPayoutsEnabled: derived.payoutsEnabled,
    },
  });

  await writeAuditLog({
    organisationId,
    actorId,
    action: "update",
    entityType: "Organisation",
    entityId: organisationId,
    changes: {
      after: {
        stripeConnectAccountId: account.id,
        stripeConnectStatus: derived.status,
        stripeConnectPayoutsEnabled: derived.payoutsEnabled,
      },
    },
  });

  await platformEvents.publish({
    type: "platform_referral.connect_updated",
    organisationId,
    entityType: "Organisation",
    entityId: organisationId,
    payload: {
      accountId: account.id,
      status: derived.status,
      payoutsEnabled: derived.payoutsEnabled,
    },
    occurredAt: new Date(),
  });

  return derived;
}

/** Create (or resume) Express account + Account Link for AU referrers. */
export async function createStripeConnectOnboardingLink(input: {
  organisationId: string;
  actorId?: string;
  email?: string;
  returnPath?: string;
}) {
  if (!isStripeConnectConfigured()) {
    return {
      ok: false as const,
      reason: "connect_not_configured" as const,
      message:
        "Stripe Connect is not enabled. Set STRIPE_CONNECT_ENABLED=true and STRIPE_SECRET_KEY.",
    };
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: {
      id: true,
      name: true,
      stripeConnectAccountId: true,
      memberships: {
        where: { status: "active", role: { in: ["owner", "admin"] } },
        select: { email: true, role: true },
        take: 5,
      },
    },
  });
  if (!org) {
    return { ok: false as const, reason: "org_not_found" as const, message: "Organisation not found" };
  }

  const stripe = getStripeClient();
  let accountId = org.stripeConnectAccountId;

  if (!accountId) {
    const email =
      input.email?.trim() ||
      org.memberships.find((m) => m.role === "owner")?.email ||
      org.memberships[0]?.email ||
      undefined;

    const account = await stripe.accounts.create({
      type: STRIPE_CONNECT_ACCOUNT_TYPE,
      country: "AU",
      email: email || undefined,
      capabilities: {
        transfers: { requested: true },
      },
      business_profile: {
        name: org.name.slice(0, 100),
        product_description:
          "DigitalGate Refer & Earn — single-level referral rewards (not multi-level marketing)",
        mcc: "7372",
      },
      metadata: {
        organisation_id: org.id,
        dg_refer_earn: "true",
      },
    });
    accountId = account.id;
    await persistConnectAccount(org.id, account, input.actorId);
  }

  const base = appBaseUrl();
  const returnPath = input.returnPath?.startsWith("/")
    ? input.returnPath
    : "/dashboard/network/refer-earn";
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}${returnPath}?connect=refresh`,
    return_url: `${base}${returnPath}?connect=return`,
    type: "account_onboarding",
  });

  return {
    ok: true as const,
    url: accountLink.url,
    accountId,
    expiresAt: accountLink.expires_at
      ? new Date(accountLink.expires_at * 1000).toISOString()
      : null,
  };
}

/** Refresh Connect status from Stripe (after return from onboarding). */
export async function syncStripeConnectAccount(input: {
  organisationId: string;
  actorId?: string;
}) {
  if (!isStripeConnectConfigured()) {
    return {
      ok: false as const,
      reason: "connect_not_configured" as const,
      connect: await getOrganisationStripeConnect(input.organisationId),
    };
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { stripeConnectAccountId: true },
  });
  if (!org?.stripeConnectAccountId) {
    return {
      ok: false as const,
      reason: "no_account" as const,
      connect: await getOrganisationStripeConnect(input.organisationId),
    };
  }

  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(org.stripeConnectAccountId);
  await persistConnectAccount(input.organisationId, account, input.actorId);

  return {
    ok: true as const,
    connect: await getOrganisationStripeConnect(input.organisationId),
  };
}

/** Create a Transfer to the referrer's Express account. */
export async function createReferralCashTransfer(input: {
  organisationId: string;
  amountCents: number;
  currency?: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}) {
  if (!isStripeConnectConfigured()) {
    throw new Error("Stripe Connect is not configured");
  }
  if (input.amountCents < 1) {
    throw new Error("Transfer amount must be positive");
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: {
      stripeConnectAccountId: true,
      stripeConnectPayoutsEnabled: true,
      stripeConnectStatus: true,
    },
  });
  if (!org?.stripeConnectAccountId) {
    throw new Error("Connect bank account not linked");
  }
  if (!org.stripeConnectPayoutsEnabled || org.stripeConnectStatus !== "complete") {
    throw new Error("Connect onboarding incomplete — payouts not enabled");
  }

  const stripe = getStripeClient();
  const transfer = await stripe.transfers.create(
    {
      amount: input.amountCents,
      currency: (input.currency ?? "aud").toLowerCase(),
      destination: org.stripeConnectAccountId,
      transfer_group: `dg_referral_${input.organisationId}`,
      metadata: {
        organisation_id: input.organisationId,
        dg_refer_earn_payout: "true",
        ...(input.metadata ?? {}),
      },
    },
    { idempotencyKey: input.idempotencyKey },
  );

  return transfer;
}

/** Webhook: account.updated → sync org Connect fields. */
/**
 * Trusted mapping: a Stripe Connect account id -> the owning DigitalGate
 * organisation.
 *
 * `event.account` on a Stripe webhook is the Stripe-signed, authoritative
 * identity of the connected account. The owner is whichever organisation the
 * account was recorded against at onboarding (persistConnectAccount). This is the
 * ONLY trusted way to resolve a tenant for a connected-account event  tenant
 * metadata must never select the tenant.
 *
 * Fails safe (null) when the account is unknown or maps to more than one
 * organisation, so a connected-account event can never mutate a tenant we cannot
 * unambiguously identify. `finder` is injectable for tests.
 */
export async function resolveOrganisationIdByConnectAccount(
  connectAccountId: string | null | undefined,
  finder?: (accountId: string) => Promise<Array<{ id: string }>>,
): Promise<string | null> {
  const id = connectAccountId?.trim();
  if (!id) return null;

  const find =
    finder ??
    (async (accountId: string) => {
      if (!process.env.DATABASE_URL) return [];
      const { prisma } = await import("@dg/database");
      return prisma.organisation.findMany({
        where: { stripeConnectAccountId: accountId },
        select: { id: true },
        take: 2,
      });
    });

  const matches = await find(id);
  return matches.length === 1 ? matches[0].id : null;
}

export async function handleConnectAccountUpdated(account: Stripe.Account) {
  const { prisma } = await import("@dg/database");

  // The account id (Stripe-signed) is authoritative. Resolve the owner from the
  // trusted mapping recorded at onboarding; ambiguous ownership is refused.
  let orgId = await resolveOrganisationIdByConnectAccount(account.id, (accountId) =>
    prisma.organisation.findMany({
      where: { stripeConnectAccountId: accountId },
      select: { id: true },
      take: 2,
    }),
  );

  // Not yet mapped (e.g. an account.updated that races the onboarding return):
  // fall back to the server-set metadata org, but never attach this account to an
  // organisation that already owns a *different* Connect account (no hijack).
  if (!orgId) {
    const metaOrgId =
      account.metadata?.organisation_id || account.metadata?.organisationId;
    if (metaOrgId) {
      const target = await prisma.organisation.findUnique({
        where: { id: metaOrgId },
        select: { id: true, stripeConnectAccountId: true },
      });
      if (
        target &&
        (!target.stripeConnectAccountId ||
          target.stripeConnectAccountId === account.id)
      ) {
        orgId = target.id;
      }
    }
  }

  if (!orgId) {
    return { ok: false as const, reason: "org_not_found" as const, accountId: account.id };
  }

  const derived = await persistConnectAccount(orgId, account);
  return {
    ok: true as const,
    organisationId: orgId,
    accountId: account.id,
    ...derived,
  };
}

/**
 * Webhook: transfer.failed / transfer.reversed — credit ledger back if we
 * already recorded a cash_payout for this transfer id.
 */
export async function handleConnectTransferFailure(input: {
  transfer: Stripe.Transfer;
  kind: "failed" | "reversed";
  failureMessage?: string;
}) {
  const { prisma } = await import("@dg/database");
  const transferId = input.transfer.id;

  const existing = await prisma.platformReferralLedger.findFirst({
    where: {
      stripeRef: transferId,
      entryType: "cash_payout",
    },
  });

  if (!existing) {
    return {
      ok: false as const,
      reason: "ledger_not_found" as const,
      transferId,
    };
  }

  const alreadyReversed = await prisma.platformReferralLedger.findFirst({
    where: {
      organisationId: existing.organisationId,
      entryType: "cash_payout_reversal",
      stripeRef: transferId,
    },
  });
  if (alreadyReversed) {
    return {
      ok: true as const,
      alreadyReversed: true as const,
      transferId,
      organisationId: existing.organisationId,
    };
  }

  const amountCents = Math.abs(existing.amountCents);
  const entry = await prisma.platformReferralLedger.create({
    data: {
      organisationId: existing.organisationId,
      referralId: existing.referralId,
      entryType: "cash_payout_reversal",
      amountCents,
      currency: existing.currency,
      description: `Cash payout ${input.kind} — balance restored`,
      stripeRef: transferId,
      metadata: {
        kind: input.kind,
        failureMessage: input.failureMessage ?? null,
        originalLedgerId: existing.id,
      } as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: existing.organisationId,
    action: "create",
    entityType: "PlatformReferralLedger",
    entityId: entry.id,
    changes: {
      after: {
        entryType: "cash_payout_reversal",
        amountCents,
        transferId,
        kind: input.kind,
      },
    },
  });

  await platformEvents.publish({
    type: "platform_referral.cash_payout_failed",
    organisationId: existing.organisationId,
    entityType: "PlatformReferralLedger",
    entityId: entry.id,
    payload: {
      transferId,
      kind: input.kind,
      amountCents,
      failureMessage: input.failureMessage ?? null,
    },
    occurredAt: new Date(),
  });

  return {
    ok: true as const,
    alreadyReversed: false as const,
    transferId,
    organisationId: existing.organisationId,
    ledgerId: entry.id,
    amountCents,
  };
}

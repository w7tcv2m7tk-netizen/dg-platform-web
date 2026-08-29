/**
 * Command Centre revenue helpers — real Commerce subscription rows only.
 */

import { mrrEquivalentFromAnnualCents } from "../billing/subscription-types";

function formatAud(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export type CommandMrrAttributionRow = {
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  subscriptionId: string;
  status: string;
  interval: string;
  /** List/charge amount for the billing interval (annual = annual cents). */
  amountCents: number;
  amountLabel: string;
  /** For annual rows: monthly equivalent (amount/12). Null for non-annual. */
  mrrEquivalentCents: number | null;
  mrrEquivalentLabel: string | null;
  /** For monthly rows: annualised (amount*12). For annual: amount itself. */
  arrEquivalentCents: number | null;
  arrEquivalentLabel: string | null;
  providerId: string;
  currentPeriodEnd: string | null;
};

export type CommandMrrAttribution = {
  generatedAt: string;
  /** Sum of monthly-interval subscription amounts only. */
  monthlyMrrCents: number;
  monthlyMrrLabel: string;
  /**
   * ARR from monthly×12 + annual subscription amounts.
   * Null/"—" when there are no active/trialing subscriptions to annualise.
   */
  arrCents: number;
  arrLabel: string;
  /** Includes active + trialing. */
  activeSubscriptionCount: number;
  trialCount: number;
  annualCount: number;
  rows: CommandMrrAttributionRow[];
  note: string;
};

/** Active / trialing Commerce subscriptions attributed to organisations (not Stripe API). */
export async function getCommandMrrAttribution(): Promise<CommandMrrAttribution> {
  const { prisma } = await import("@dg/database");

  const subscriptions = await prisma.commerceSubscription.findMany({
    where: { status: { in: ["active", "trialing"] } },
    orderBy: { amountCents: "desc" },
    take: 100,
    include: {
      organisation: { select: { id: true, name: true, slug: true } },
    },
  });

  const monthly = subscriptions.filter((s) => s.interval === "month");
  const annual = subscriptions.filter((s) => s.interval === "year");
  const monthlyMrrCents = monthly.reduce((sum, s) => sum + s.amountCents, 0);
  const annualAmountsCents = annual.reduce((sum, s) => sum + s.amountCents, 0);
  const arrCents = monthlyMrrCents * 12 + annualAmountsCents;
  const trialCount = subscriptions.filter((s) => s.status === "trialing").length;
  const annualCount = annual.length;

  return {
    generatedAt: new Date().toISOString(),
    monthlyMrrCents,
    monthlyMrrLabel: formatAud(monthlyMrrCents),
    arrCents,
    arrLabel: formatAud(arrCents),
    activeSubscriptionCount: subscriptions.length,
    trialCount,
    annualCount,
    rows: subscriptions.map((s) => {
      const isAnnual = s.interval === "year";
      const isMonthly = s.interval === "month";
      // Annual amount is the yearly charge; MRR equivalent = round(annual/12).
      const mrrEquivalentCents = isAnnual
        ? mrrEquivalentFromAnnualCents(s.amountCents)
        : null;
      const arrEquivalentCents = isAnnual
        ? s.amountCents
        : isMonthly
          ? s.amountCents * 12
          : null;

      return {
        organisationId: s.organisation.id,
        organisationName: s.organisation.name,
        organisationSlug: s.organisation.slug,
        subscriptionId: s.id,
        status: s.status,
        interval: s.interval,
        amountCents: s.amountCents,
        amountLabel: formatAud(s.amountCents),
        mrrEquivalentCents,
        mrrEquivalentLabel:
          mrrEquivalentCents != null ? formatAud(mrrEquivalentCents) : null,
        arrEquivalentCents,
        arrEquivalentLabel:
          arrEquivalentCents != null ? formatAud(arrEquivalentCents) : null,
        providerId: s.providerId,
        currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
      };
    }),
    note:
      "MRR is recurring subscription value from Commerce records (monthly interval + annual÷12). It is not the same as revenue received (invoices paid) or Growth Engine “MRR Won”. Stripe may differ until webhook sync is complete.",
  };
}

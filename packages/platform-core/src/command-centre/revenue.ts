/**
 * Command Centre revenue helpers — real Commerce subscription rows only.
 */

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
  amountCents: number;
  amountLabel: string;
  providerId: string;
  currentPeriodEnd: string | null;
};

export type CommandMrrAttribution = {
  generatedAt: string;
  monthlyMrrCents: number;
  monthlyMrrLabel: string;
  activeSubscriptionCount: number;
  rows: CommandMrrAttributionRow[];
  note: string;
};

/** Active monthly Commerce subscriptions attributed to organisations (not Stripe API). */
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
  const monthlyMrrCents = monthly.reduce((sum, s) => sum + s.amountCents, 0);

  return {
    generatedAt: new Date().toISOString(),
    monthlyMrrCents,
    monthlyMrrLabel: formatAud(monthlyMrrCents),
    activeSubscriptionCount: subscriptions.length,
    rows: subscriptions.map((s) => ({
      organisationId: s.organisation.id,
      organisationName: s.organisation.name,
      organisationSlug: s.organisation.slug,
      subscriptionId: s.id,
      status: s.status,
      interval: s.interval,
      amountCents: s.amountCents,
      amountLabel: formatAud(s.amountCents),
      providerId: s.providerId,
      currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    })),
    note: "Attributed from CommerceSubscription rows (platform SoT). Stripe dashboard may differ until webhook sync is complete.",
  };
}

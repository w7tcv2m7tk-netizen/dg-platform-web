import { annualPriceFromMonthlyCents } from "./subscription-types";
import { paidAppCheckoutLines, normalisePaidAppKeys, GROWTH_SUITE_WITH_INDUSTRY_MONTHLY_CENTS } from "./paid-apps";
import { PLATFORM_COMMERCIAL_PLANS, SUPPORT_COMMERCIAL_PLANS } from "./commercial-catalogue";
import { industryCheckoutLines, industryIdForAppOrTemplate } from "../industry/platform";

export type PurchasedLineExpectationInput = {
  industryApps: string[];
  premiumApps: unknown;
  cadence: "monthly" | "annual";
  platformTier?: string;
  supportPlan?: string;
  platformPriceId?: string | null;
};

export type StripePurchasedSubscriptionItem = {
  quantity?: number | null;
  price: {
    id?: string;
    unit_amount: number | null;
    currency: string;
    recurring: { interval: string; interval_count?: number } | null;
    product: string | { id?: string; name?: string | null; deleted?: unknown };
  };
};

/** Expected paid Industry and premium lines generated from the canonical catalogue. */
export function expectedPurchasedLineItems(input: PurchasedLineExpectationInput) {
  for (const id of input.industryApps) {
    if (!industryIdForAppOrTemplate(id)) throw new Error(`Unknown Industry App selection: ${id}`);
  }
  const annual = input.cadence === "annual";
  const industryLines = industryCheckoutLines(input.industryApps);
  const premiumApps = normalisePaidAppKeys(input.premiumApps);
  const bundledIndustry = premiumApps.includes("growth_suite")
    ? industryLines.find((line) => line.kind === "industry") ?? null
    : null;
  const amount = (monthlyCents: number) => annual ? annualPriceFromMonthlyCents(monthlyCents) : monthlyCents;
  const expected: Array<{ name?: string; priceId?: string | null; amountCents: number }> = [];

  if (input.platformTier) {
    const plan = PLATFORM_COMMERCIAL_PLANS.find((item) => item.id === input.platformTier);
    if (!plan) throw new Error(`Unknown platform tier: ${input.platformTier}`);
    expected.push({
      name: input.platformPriceId ? undefined : `DigitalGate ${plan.name}${annual ? " (Annual)" : ""}`,
      priceId: input.platformPriceId,
      amountCents: amount(plan.monthlyCents),
    });
  }

  if (bundledIndustry) {
    expected.push({
      name: annual
        ? `DigitalGate Growth Suite + ${bundledIndustry.industryLabel} Industry App (Annual)`
        : `DigitalGate Growth Suite + ${bundledIndustry.industryLabel} Industry App`,
      amountCents: amount(GROWTH_SUITE_WITH_INDUSTRY_MONTHLY_CENTS),
    });
  }
  for (const line of industryLines) {
    if (bundledIndustry === line) continue;
    expected.push({ name: annual ? `${line.name} (Annual)` : line.name, amountCents: amount(line.amountCents) });
  }
  for (const line of paidAppCheckoutLines(premiumApps)) {
    if (bundledIndustry && line.key === "growth_suite") continue;
    expected.push({ name: annual ? `${line.name} (Annual)` : line.name, amountCents: amount(line.amountCents) });
  }
  const support = SUPPORT_COMMERCIAL_PLANS.find((item) => item.id === input.supportPlan);
  if (support?.monthlyCents) {
    expected.push({
      name: `DigitalGate ${support.name}${annual ? " (Annual)" : ""}`,
      amountCents: amount(support.monthlyCents),
    });
  }
  return expected;
}

/** Metadata alone never grants these purchases: every projection must have an exact live Stripe item. */
export function stripeItemsMatchPurchasedSelections(
  items: readonly StripePurchasedSubscriptionItem[],
  input: PurchasedLineExpectationInput,
): boolean {
  let expected: ReturnType<typeof expectedPurchasedLineItems>;
  try {
    expected = expectedPurchasedLineItems(input);
  } catch {
    return false;
  }
  const interval = input.cadence === "annual" ? "year" : "month";
  const remaining = [...items];
  for (const line of expected) {
    const matches = remaining
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        const productName = typeof item.price.product === "string" ? null : item.price.product.name;
        return (line.priceId ? item.price.id === line.priceId : productName === line.name) && item.price.unit_amount === line.amountCents &&
          item.price.currency.toLowerCase() === "aud" && item.price.recurring?.interval === interval &&
          (item.price.recurring.interval_count ?? 1) === 1 && (item.quantity ?? 1) === 1;
      });
    if (matches.length !== 1) return false;
    remaining.splice(matches[0]!.index, 1);
  }
  return remaining.length === 0;
}

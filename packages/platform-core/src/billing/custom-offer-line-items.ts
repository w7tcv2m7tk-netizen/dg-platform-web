import type { CustomCommercialOffer } from "./commercial-offer";
import { industryIdForAppOrTemplate } from "../industry/platform";
import { normalisePaidAppKeys } from "./paid-apps";

type Price = {
  id: string;
  unit_amount: number | null;
  currency: string;
  recurring?: { interval: string; interval_count?: number | null } | null;
  product: string | { id?: string; name?: string | null; metadata?: Record<string, string>; deleted?: unknown };
};
type Line = { quantity?: number | null; price: Price | null };
type Metadata = Record<string, string | undefined>;

const product = (price: Price) => typeof price.product === "string" ? null : price.product;
function offerMetadataMatches(metadata: Metadata, offer: CustomCommercialOffer): boolean {
  const listMatches = (key: string, expected: string[]) => {
    return metadata[key] === expected.join(",");
  };
  return metadata.dg_commercial_offer_id === offer.id &&
    metadata.dg_commercial_offer_label === offer.label &&
    metadata.dg_commercial_offer_version === String(offer.version) &&
    metadata.dg_offer_currency === offer.currency &&
    metadata.dg_platform_tier === offer.platformTier &&
    metadata.dg_billing_cadence === offer.cadence &&
    metadata.dg_support_plan === (offer.supportPlan ?? "standard") &&
    metadata.dg_subscription_amount_cents === String(offer.amountCents) &&
    metadata.dg_one_off_amount_cents === String(offer.oneOffAmountCents ?? 0) &&
    metadata.dg_one_off_label === (offer.oneOffAmountCents ? (offer.oneOffLabel ?? "Implementation & setup") : "") &&
    metadata.dg_trial_days === String(offer.trialDays) &&
    metadata.dg_seats === String(offer.seats ?? "") &&
    listMatches("dg_industry_apps", offer.industryApps) &&
    listMatches("dg_industry_templates", offer.industryTemplates) &&
    listMatches("dg_premium_apps", offer.premiumApps);
}

function priceMatches(price: Price | null, input: {
  offer: CustomCommercialOffer;
  amount: number;
  recurring: boolean;
  productName: string;
  interval?: string;
}): boolean {
  if (!price || price.unit_amount !== input.amount || price.currency.toLowerCase() !== input.offer.currency ||
    (price.recurring !== null) !== input.recurring) return false;
  if (input.recurring && (!price.recurring || price.recurring.interval !== input.interval || (price.recurring.interval_count ?? 1) !== 1)) return false;
  const p = product(price);
  return Boolean(p && p.deleted !== true && p.name === input.productName && p.metadata?.dg_commercial_offer_id === input.offer.id);
}

/** Requires the accepted offer to be proven by exact recurring and Checkout line items. */
export function customOfferPurchaseMatches(input: {
  sessionMetadata: Metadata;
  subscriptionMetadata: Metadata;
  subscriptionItems: readonly Line[];
  checkoutLineItems: readonly Line[];
  offer: CustomCommercialOffer;
  organisationId: string;
  checkoutCustomerId: string;
  subscriptionCustomerId: string;
  subscriptionStatus: string;
  trialStart: number | null;
  trialEnd: number | null;
}): boolean {
  const { offer } = input;
  const industryApps = [...offer.industryApps, ...offer.industryTemplates];
  const premium = normalisePaidAppKeys(offer.premiumApps);
  if (industryApps.some((id) => !industryIdForAppOrTemplate(id)) || new Set(industryApps).size !== industryApps.length ||
    premium.length !== offer.premiumApps.length || new Set(offer.premiumApps).size !== offer.premiumApps.length) return false;
  if (!offerMetadataMatches(input.sessionMetadata, offer) || !offerMetadataMatches(input.subscriptionMetadata, offer)) return false;
  if (!input.organisationId || input.sessionMetadata.organisation_id !== input.organisationId ||
    input.subscriptionMetadata.organisation_id !== input.organisationId ||
    !input.checkoutCustomerId || input.subscriptionCustomerId !== input.checkoutCustomerId ||
    input.subscriptionMetadata.dg_platform_subscription !== "true") return false;

  const interval = offer.cadence === "annual" ? "year" : "month";
  if (input.checkoutLineItems.length !== (offer.oneOffAmountCents ? 2 : 1) || input.subscriptionItems.length !== 1) return false;
  const recurringLine = input.checkoutLineItems.find((line) => line.price?.recurring !== null);
  if (!recurringLine || recurringLine.quantity !== 1 || !priceMatches(recurringLine.price, {
    offer, amount: offer.amountCents, recurring: true, productName: offer.label, interval,
  })) return false;
  const subscriptionLine = input.subscriptionItems[0]!;
  if (subscriptionLine.quantity !== 1 || !priceMatches(subscriptionLine.price, {
    offer, amount: offer.amountCents, recurring: true, productName: offer.label, interval,
  }) || subscriptionLine.price?.id !== recurringLine.price?.id) return false;

  if (offer.oneOffAmountCents) {
    const setupLines = input.checkoutLineItems.filter((line) => line.price?.recurring === null);
    const setupLabel = offer.oneOffLabel ?? "Implementation & setup";
    if (setupLines.length !== 1 || setupLines[0]!.quantity !== 1 || !priceMatches(setupLines[0]!.price, {
      offer, amount: offer.oneOffAmountCents, recurring: false, productName: setupLabel,
    }) || product(setupLines[0]!.price!)?.metadata?.dg_charge_type !== "one_off_implementation") return false;
  }

  if (offer.trialDays > 0) {
    if (!input.trialStart || !input.trialEnd || !["trialing", "active"].includes(input.subscriptionStatus) ||
      Math.abs((input.trialEnd - input.trialStart) - offer.trialDays * 86400) > 5) return false;
  } else if (input.trialStart || input.trialEnd || input.subscriptionStatus === "trialing") {
    return false;
  }
  return true;
}

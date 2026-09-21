import {
  GROWTH_APP_CATALOG,
  PLATFORM_ADDON_CATALOG,
  PLATFORM_CAPABILITY_CATALOG,
  PLATFORM_TIER_CATALOG,
} from "@/lib/pricing-catalog";

/** Authoritative published pricing excerpt for public Aida — sourced from the catalog. */
export function publicAidaPricingBrief(): string {
  const tiers = PLATFORM_TIER_CATALOG.map(
    (t) =>
      `- ${t.label} — ${t.price}${t.period} — ${t.users} — ${t.outcome} Features: ${t.features.join("; ")}.`,
  );
  const addons = PLATFORM_ADDON_CATALOG.map((a) => `- ${a.label} — ${a.price} — ${a.description}`);
  const caps = PLATFORM_CAPABILITY_CATALOG.map(
    (c) => `- ${c.label} — ${c.price} — ${c.description}`,
  );
  const growth = GROWTH_APP_CATALOG.map((g) => `- ${g.label} — ${g.price} — ${g.description}`);
  return [
    "Published platform pricing (authoritative catalog — do not invent other prices):",
    "Four commercial layers. Growth Suite and Industry are add-ons on top of the selected Core Platform — they do not replace Core.",
    "1. Core Platform: Starter $99/mo (1 user, 1 business) · Growth $249/mo (up to 5 users, 1 business) · Scale $499/mo (unlimited users, up to 5 businesses, specialist industry integrations & API access) · Enterprise custom.",
    "2. Growth: Growth Suite $399/mo is the recommended add-on (Advertising, Marketing, Prospecting & Opportunity Engine, AI Visibility, SEO, Automation, Analytics, Social, Reputation). Individual Growth Apps remain available.",
    "3. Industry Apps: $149/mo each, one primary sub-industry included, extra sub-industry Apps +$29/mo. Do not charge the parent Industry and its included primary sub-industry as two $149 items.",
    "4. Support & Success is optional and separate (Standard included; Priority $199/mo; Success Partner $499/mo; Enterprise custom).",
    "Growth Suite + Industry is $499/mo as an add-on (Growth Suite $399 + Industry $149 = $548 separately; save $49/mo). It does not include Starter, Growth, Scale or Enterprise. Example: Growth Core $249 + Growth Suite + Industry $499 = $748/mo.",
    "Scale multi-business rules: up to 5 active businesses total; businesses must be owned, operated or legitimately managed by the subscribing customer/group; this is not a reseller licence for unrelated clients. Each business remains a separate tenant. Businesses may be in different industries. Industry API access requires the relevant paid Industry App/Template and does not include third-party provider fees/services. Archived businesses do not consume an active slot; abuse of archiving to circumvent the limit is not permitted. More than 5 active businesses requires Enterprise/custom.",
    "AI Communications $99/mo is Coming Soon and is not in Growth Suite.",
    "Platform tiers:",
    ...tiers,
    "Platform capabilities:",
    ...caps,
    "Add-ons:",
    ...addons,
    "Individual Growth Apps (optional, billed separately unless listed as included or Free):",
    ...growth,
    "If unpublished packaging, discounts, or custom quotes are requested, do not guess — offer a handoff to the DigitalGate team.",
  ].join("\n");
}

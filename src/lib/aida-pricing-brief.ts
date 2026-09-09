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
    "Platform tiers:",
    ...tiers,
    "Platform capabilities:",
    ...caps,
    "Add-ons:",
    ...addons,
    "Growth Apps (optional, billed separately unless listed as included):",
    ...growth,
    "If unpublished packaging, discounts, or custom quotes are requested, do not guess — offer a handoff to the DigitalGate team.",
  ].join("\n");
}

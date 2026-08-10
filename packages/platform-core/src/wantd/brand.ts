/**
 * Wantd visual identity — Western heritage, modern digital marketplace.
 * Cream + Charcoal + Antique Gold + Western Red. No SaaS gradients.
 * @see docs/WANTD.md § Brand
 */

/** Locked colour tokens (light marketplace + dark listing surfaces). */
export const WANTD_COLOURS = {
  black: "#171513",
  charcoal: "#292622",
  cream: "#F5EBDD",
  antiqueWhite: "#FFF9EF",
  saddleTan: "#B88952",
  brassGold: "#C49A5A",
  westernRed: "#8E3028",
  dustyRed: "#B94A3D",
  mutedSage: "#69705C",
} as const;

export type WantdColourKey = keyof typeof WANTD_COLOURS;

/**
 * Approximate surface ratio for light marketplace UI:
 * 60% cream · 20% black/charcoal · 10% tan/gold · 5% western red · 5% other.
 */
export const WANTD_PALETTE_RATIO = {
  creamOffWhite: 0.6,
  blackCharcoal: 0.2,
  tanGold: 0.1,
  westernRed: 0.05,
  supporting: 0.05,
} as const;

/** Marketplace category tiles on the public homepage (MVP links). */
export const WANTD_CATEGORIES = [
  { id: "cars", label: "Cars", href: "/wantd?category=cars" },
  { id: "property", label: "Property", href: "/wantd/property" },
  { id: "jobs", label: "Jobs", href: "/wantd?category=jobs" },
  { id: "services", label: "Services", href: "/wantd?category=services" },
  { id: "electronics", label: "Electronics", href: "/wantd?category=electronics" },
  { id: "home", label: "Home", href: "/wantd?category=home" },
  { id: "everything", label: "Everything", href: "/wantd?category=everything" },
] as const;

export const WANTD_TAGLINE = "Tell the marketplace what you WANT.";
export const WANTD_HERO_PROMPT = "What are you looking for?";

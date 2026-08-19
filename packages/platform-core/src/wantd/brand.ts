/**
 * Wantd visual identity — demand-first marketplace.
 * Warm neutrals + one energetic accent. Not a cowboy theme, not a classifieds portal.
 * @see docs/WANTD.md § Brand
 */

/** Locked colour tokens (light marketplace UI). */
export const WANTD_COLOURS = {
  black: "#121212",
  charcoal: "#1C1C1C",
  cream: "#F7F5F1",
  antiqueWhite: "#FFFFFF",
  ink: "#121212",
  muted: "#6B6762",
  line: "#E8E4DC",
  accent: "#C6F04A",
  accentHover: "#D4FF5C",
  /** @deprecated Use accent — kept so older patches still resolve. */
  saddleTan: "#6B6762",
  /** @deprecated Use accent */
  brassGold: "#C6F04A",
  /** @deprecated Use accent */
  westernRed: "#C6F04A",
  dustyRed: "#D4FF5C",
  mutedSage: "#6B6762",
} as const;

export type WantdColourKey = keyof typeof WANTD_COLOURS;

/**
 * Approximate surface ratio:
 * ~70% warm paper · 20% ink · 10% accent (CTAs / marks only).
 */
export const WANTD_PALETTE_RATIO = {
  creamOffWhite: 0.7,
  blackCharcoal: 0.2,
  tanGold: 0.0,
  westernRed: 0.0,
  supporting: 0.1,
} as const;

/** Marketplace category tiles (MVP links). Property is live. */
export const WANTD_CATEGORIES = [
  { id: "property", label: "Property", href: "/wantd/property" },
  { id: "cars", label: "Cars", href: "/wantd?category=cars" },
  { id: "products", label: "Products", href: "/wantd?category=products" },
  { id: "services", label: "Services", href: "/wantd?category=services" },
  { id: "stays", label: "Stays", href: "/wantd?category=stays" },
  { id: "work", label: "Work", href: "/wantd?category=work" },
  { id: "business", label: "Business", href: "/wantd?category=business" },
] as const;

export const WANTD_TAGLINE = "Tell us what you want.";
export const WANTD_SUPPORTING = "The market comes to you.";
export const WANTD_HERO_PROMPT = "What do you want?";

export const WANTD_NAV = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Tell us what you want", href: "/post-a-want" },
  { label: "For agents", href: "/for-agents" },
  { label: "About", href: "/about" },
] as const;

export const WANTD_PLACEHOLDERS = [
  "I want a 4 bedroom acreage home near the Gold Coast under $2m…",
  "I want a beach house…",
  "I want a LandCruiser under $90,000…",
  "I need a wedding photographer…",
  "I want somewhere to stay…",
  "I want a graphic designer…",
] as const;

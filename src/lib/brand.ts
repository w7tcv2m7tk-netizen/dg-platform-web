/**
 * DigitalGate brand assets — single source of truth.
 *
 * Preference: light marks on dark backgrounds (platform default).
 * Use navy or dark marks on white/light surfaces only.
 */

export type BrandTheme = "on-dark" | "on-light";

/** Absolute HTTPS — safe for email clients (relative paths break in mail). */
export const BRAND_EMAIL_ICON =
  "https://app.digitalgate.com.au/brand/icon-light.png";

export const BRAND_EMAIL_LOGO =
  "https://app.digitalgate.com.au/brand/logo-on-dark.png";

const OG_BASE = "https://app.digitalgate.com.au/og";

/** Dedicated 1200×630 share images (not the wordmark). */
export const PUBLIC_OG_IMAGES: Record<string, string> = {
  digitalgate: `${OG_BASE}/digitalgate.png`,
  "digitalgate-audit": `${OG_BASE}/digitalgate.png`,
  "roe-realty": `${OG_BASE}/roe-realty.png`,
  "roe-realty-report": `${OG_BASE}/roe-realty.png`,
  "currumbin-valley-hideaway": `${OG_BASE}/cvh.png`,
  "currumbin-valley-hideaway-circle": `${OG_BASE}/cvh.png`,
  wantd: "https://wantd.co.nz/brand/wantd-icon.png",
};

export const DEFAULT_PUBLIC_OG_IMAGE = PUBLIC_OG_IMAGES.digitalgate;

export function publicOgImageForSlug(
  slug: string,
  explicit?: string | null,
): string {
  if (explicit?.trim()) return explicit.trim();
  return PUBLIC_OG_IMAGES[slug] || DEFAULT_PUBLIC_OG_IMAGE;
}

/** Per-site tab icons. Unlisted slugs keep the DigitalGate root favicon. */
export const PUBLIC_SITE_ICONS: Record<
  string,
  { icon: string; favicon32: string; apple: string }
> = {
  wantd: {
    icon: "/brand/wantd-icon.png",
    favicon32: "/brand/wantd-favicon-32.png",
    apple: "/brand/wantd-apple-touch.png",
  },
};

export function publicSiteIcons(
  slug: string,
  explicit?: string | null,
):
  | {
      icon: Array<{ url: string; type?: string; sizes?: string }>;
      apple: Array<{ url: string; type?: string; sizes?: string }>;
    }
  | undefined {
  const mapped = PUBLIC_SITE_ICONS[slug];
  if (mapped) {
    return {
      icon: [
        { url: mapped.favicon32, type: "image/png", sizes: "32x32" },
        { url: mapped.icon, type: "image/png" },
      ],
      apple: [{ url: mapped.apple, type: "image/png", sizes: "180x180" }],
    };
  }
  const custom = explicit?.trim();
  if (!custom) return undefined;
  return {
    icon: [
      {
        url: custom,
        type: custom.endsWith(".svg") ? "image/svg+xml" : "image/png",
      },
    ],
    apple: [{ url: custom, type: "image/png", sizes: "180x180" }],
  };
}

export const BRAND_ASSETS = {
  "on-dark": {
    /** Icon Light Door — canonical mark (black frame, white door) */
    icon: "/brand/icon-light.png",
    /** White wordmark — transparent canvas */
    logo: "/brand/logo-on-dark.png",
  },
  "on-light": {
    icon: "/brand/icon-light.png",
    logo: "/brand/logo-navy.png",
  },
} as const;

/** Default paths (light on dark — matches app shell) */
export const BRAND_DEFAULT = BRAND_ASSETS["on-dark"];

export function brandAssetsForTheme(theme: BrandTheme = "on-dark") {
  return BRAND_ASSETS[theme];
}

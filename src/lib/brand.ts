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

/**
 * DigitalGate brand assets — single source of truth.
 *
 * Preference: light marks on dark backgrounds (platform default).
 * Use navy or dark marks on white/light surfaces only.
 */

export type BrandTheme = "on-dark" | "on-light";

export const BRAND_EMAIL_ICON = "/brand/icon-light.png";

export const BRAND_ASSETS = {
  "on-dark": {
    /** Icon Light Door — black mark; multiply drops the white PNG canvas */
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

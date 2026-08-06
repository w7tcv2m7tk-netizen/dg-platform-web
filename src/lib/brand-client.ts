import type { OrgBrandTheme } from "@dg/platform-core";

/** Client-safe default theme — no server imports. */
export const DEFAULT_ORG_BRAND_THEME: OrgBrandTheme = {
  businessName: "DigitalGate",
  primaryColor: "#3b82f6",
  accentColor: "#10b981",
  hasCustomBrand: false,
};

export {
  DEFAULT_ORG_ACCENT,
  DEFAULT_ORG_PRIMARY,
  normalizeHex,
  orgBrandCssVariables,
  parseBrandColours,
  resolveOrgShellPalette,
  serializeBrandColours,
} from "@dg/platform-core/org/brand-theme";

export type { OrganisationBusinessProfile } from "@dg/platform-core/org/business-profile-types";

import {
  getOrganisationBusinessProfile,
  resolveOrgBrandTheme,
  type OrgBrandTheme,
} from "@dg/platform-core";
import { cache } from "react";

import { getPlatformPageContext } from "@/lib/platform-page-context";

export const DEFAULT_ORG_BRAND_THEME: OrgBrandTheme = {
  businessName: "DigitalGate",
  primaryColor: "#3b82f6",
  accentColor: "#10b981",
  hasCustomBrand: false,
};

/** Resolve active org brand theme once per request. */
export const getOrgBrandThemeCached = cache(async (): Promise<OrgBrandTheme> => {
  const { session } = await getPlatformPageContext();
  if (!session) return DEFAULT_ORG_BRAND_THEME;

  const profile = process.env.DATABASE_URL
    ? await getOrganisationBusinessProfile(session.organisationId)
    : null;

  return resolveOrgBrandTheme({
    profile,
    organisationName: session.organisationName,
  });
});

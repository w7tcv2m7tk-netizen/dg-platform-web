import {
  getOrganisationBusinessProfile,
  resolveOrgBrandTheme,
  type OrgBrandTheme,
} from "@dg/platform-core";
import { cache } from "react";

import { DEFAULT_ORG_BRAND_THEME } from "@/lib/brand-client";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export { DEFAULT_ORG_BRAND_THEME };

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

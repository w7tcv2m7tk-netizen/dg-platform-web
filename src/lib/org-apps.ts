import { getOrgEnabledAppIdsCached } from "@/lib/platform-page-context";

/** @deprecated Use getOrgEnabledAppIdsCached — kept for existing imports */
export async function getOrgEnabledAppIds(): Promise<string[]> {
  return getOrgEnabledAppIdsCached();
}

export { getOrgEnabledAppIdsCached, getOrgIndustrySelectionIdsCached, getPlatformPageContext } from "@/lib/platform-page-context";

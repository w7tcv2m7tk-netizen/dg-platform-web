/**
 * Website Builder feature gate — org flag `websites.builder`.
 * Health Centre remains available without this flag.
 *
 * MVP soft-on: available unless explicitly disabled (`websites.builder: false`)
 * or `DG_WEBSITES_BUILDER=0`. Force on with `DG_WEBSITES_BUILDER=1`.
 */

import {
  getOrganisationFeatureFlags,
  organisationHasFlag,
} from "../features/flags";

export const WEBSITES_BUILDER_FLAG = "websites.builder";

export function websitesBuilderEnvEnabled(): boolean {
  const raw = process.env.DG_WEBSITES_BUILDER?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}

function websitesBuilderEnvDisabled(): boolean {
  const raw = process.env.DG_WEBSITES_BUILDER?.trim().toLowerCase();
  return raw === "0" || raw === "false" || raw === "off";
}

export async function organisationHasWebsitesBuilder(
  organisationId: string,
): Promise<boolean> {
  if (websitesBuilderEnvDisabled()) return false;
  if (websitesBuilderEnvEnabled()) return true;

  const flags = await getOrganisationFeatureFlags(organisationId);
  if (flags[WEBSITES_BUILDER_FLAG] === false) return false;
  if (flags[WEBSITES_BUILDER_FLAG] === true) return true;

  // MVP: soft-on when unset so orgs can use Studio without a Command Centre flip.
  // Explicit false still gates; Command Centre can force on/off.
  return true;
}

/** Strict check — true only when flag or env force-on (used by Command Centre). */
export async function organisationHasWebsitesBuilderStrict(
  organisationId: string,
): Promise<boolean> {
  if (websitesBuilderEnvEnabled()) return true;
  return organisationHasFlag(organisationId, WEBSITES_BUILDER_FLAG);
}

/**
 * Google Cloud project already allowlisted for Business Profile APIs.
 *
 * Google approves **one project per business**. Do not apply for another.
 * Canonical ops: `docs/connectors/GOOGLE-GBP.md`.
 */

/** Numeric Cloud project number from the GBP API Team letter (they labelled it Project ID). */
export const GOOGLE_GBP_ALLOWLISTED_PROJECT_NUMBER = "742705345842";

/** Website Google associated with the allowlisted project. */
export const GOOGLE_GBP_ALLOWLISTED_WEBSITE = "https://digitalgate.com.au/";

export type GoogleGbpAllowlistedProject = {
  projectNumber: string;
  website: string;
  /** True when GOOGLE_CLIENT_ID is issued from the allowlisted project. */
  clientFromAllowlistedProject: boolean | null;
};

/**
 * OAuth web client IDs are `{projectNumber}-{suffix}.apps.googleusercontent.com`.
 * Returns false for empty / non-Google client ids.
 */
export function googleClientIdMatchesAllowlistedProject(clientId: string): boolean {
  const trimmed = clientId.trim();
  if (!trimmed) return false;
  return trimmed.startsWith(`${GOOGLE_GBP_ALLOWLISTED_PROJECT_NUMBER}-`);
}

/** Operator status for Settings → Connectors (never shown on customer Connected Services). */
export function inspectGoogleGbpAllowlistedProject(
  clientId: string = process.env.GOOGLE_CLIENT_ID ?? "",
): GoogleGbpAllowlistedProject {
  const trimmed = clientId.trim();
  return {
    projectNumber: GOOGLE_GBP_ALLOWLISTED_PROJECT_NUMBER,
    website: GOOGLE_GBP_ALLOWLISTED_WEBSITE,
    clientFromAllowlistedProject: trimmed
      ? googleClientIdMatchesAllowlistedProject(trimmed)
      : null,
  };
}

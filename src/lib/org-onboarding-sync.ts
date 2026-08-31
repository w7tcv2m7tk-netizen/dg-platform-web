/**
 * @deprecated P1 — Gen 2 onboarding no longer pulls from WordPress portal.
 * Historical WP→Neon import uses explicit migration tooling, not live shell sync.
 */
export async function ensureOrganisationOnboardingSync(_force = false) {
  return null;
}

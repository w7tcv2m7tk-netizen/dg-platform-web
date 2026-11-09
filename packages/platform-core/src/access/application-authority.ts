import { hasPlatformAuthority, type PlatformAuthorityInput } from "./platform-authority";

/** Canonical database projection only; editable settings and names are not inputs. */
export function hasCanonicalSubscriptionExemption(
  authority: { organisationId: string; platformExempt?: boolean } | null | undefined,
  organisationId: string,
): boolean {
  return Boolean(organisationId && authority?.organisationId === organisationId && authority.platformExempt === true);
}

/** Commercial exemption is independent of operator authority and tenant permissions. */
export function hasApplicationCommercialExemption(input: {
  organisationId: string;
  authority?: { organisationId: string; platformExempt?: boolean } | null;
  actor?: PlatformAuthorityInput;
}): boolean {
  return hasCanonicalSubscriptionExemption(input.authority, input.organisationId) || Boolean(
    input.actor?.organisationId === input.organisationId && hasPlatformAuthority(input.actor),
  );
}

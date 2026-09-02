/**
 * Shared result shape for explicit organisation creation.
 *
 * Organisations are ONLY created through the explicit onboarding/create flow
 * (`createOrganisationForUser` via /api/v1/org/create) or the operator-driven
 * prospect -> client conversion (`createClientOrganisation`). There is no
 * implicit or automatic provisioning: authentication establishes identity,
 * membership establishes tenant context, explicit onboarding creates a tenant.
 */

export interface ProvisionOrganisationResult {
  organisationId: string;
  membershipId: string;
  slug: string;
  created: boolean;
  joinedViaInvite?: boolean;
}

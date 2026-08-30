/**
 * Growth Engine access scope.
 *
 * GrowthProspect rows are dual-natured: most belong to a tenant
 * (`organisationId`), while some are platform-owned prospecting records with a
 * null organisation. Previously the read/write helpers took
 * `organisationId?: string`, where *omitting* the argument silently disabled
 * tenant filtering — so a route that forgot to pass it returned every tenant's
 * prospects.
 *
 * This module replaces that with an explicit, non-optional scope. There is no
 * "unscoped" value: a caller must either name the tenant or present a
 * platform-operator capability, and the platform capability cannot be forged
 * (see access/platform-operator-context).
 */

import {
  isPlatformOperatorContext,
  type PlatformOperatorContext,
} from "../../access/platform-operator-context";

export type GrowthScope =
  | { readonly kind: "organisation"; readonly organisationId: string }
  | { readonly kind: "platform"; readonly operator: PlatformOperatorContext };

/** Scope every read/write to a single tenant. */
export function organisationGrowthScope(organisationId: string): GrowthScope {
  const id = organisationId?.trim();
  if (!id) {
    throw new Error("organisationGrowthScope requires an organisationId");
  }
  return { kind: "organisation", organisationId: id };
}

/** Deliberately cross-tenant scope — platform operators only. */
export function platformGrowthScope(
  operator: PlatformOperatorContext,
): GrowthScope {
  if (!isPlatformOperatorContext(operator)) {
    throw new Error("platformGrowthScope requires a platform operator context");
  }
  return { kind: "platform", operator };
}

export function isPlatformGrowthScope(
  scope: GrowthScope,
): scope is Extract<GrowthScope, { kind: "platform" }> {
  return scope.kind === "platform" && isPlatformOperatorContext(scope.operator);
}

/**
 * Prisma `where` fragment for the scope.
 *
 * Tenant scope pins `organisationId`. Platform scope adds no filter, which is
 * safe only because the caller proved platform authority to build it.
 */
export function growthScopeWhere(scope: GrowthScope): {
  organisationId?: string;
} {
  if (isPlatformGrowthScope(scope)) return {};
  if (scope.kind === "organisation") {
    return { organisationId: scope.organisationId };
  }
  // Malformed scope (e.g. forged platform scope from an untyped path).
  throw new Error("Invalid GrowthScope");
}

/** Prisma `where` fragment for children joined via their prospect. */
export function growthScopeProspectWhere(scope: GrowthScope): {
  prospect?: { organisationId: string };
} {
  if (isPlatformGrowthScope(scope)) return {};
  if (scope.kind === "organisation") {
    return { prospect: { organisationId: scope.organisationId } };
  }
  throw new Error("Invalid GrowthScope");
}

/** True when a loaded record is visible in this scope. */
export function isInGrowthScope(
  record: { organisationId?: string | null } | null | undefined,
  scope: GrowthScope,
): boolean {
  if (!record) return false;
  if (isPlatformGrowthScope(scope)) return true;
  if (scope.kind !== "organisation") return false;
  return record.organisationId === scope.organisationId;
}

/** Actor id for audit trails, whichever scope is in use. */
export function growthScopeActorOrganisationId(
  scope: GrowthScope,
): string | null {
  if (isPlatformGrowthScope(scope)) {
    return scope.operator.operatorOrganisationId;
  }
  return scope.kind === "organisation" ? scope.organisationId : null;
}

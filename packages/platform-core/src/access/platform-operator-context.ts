/**
 * Platform operator capability — a proof object for deliberately cross-tenant
 * operations.
 *
 * Why this exists: route-level guards are easy to forget. Functions that can
 * read or mutate data belonging to *any* organisation (Command Centre reads,
 * prospect → client-org conversion, platform-wide Growth Engine listings)
 * previously accepted plain arguments, so a route that forgot
 * `requireCommandCentre` silently exposed every tenant.
 *
 * A `PlatformOperatorContext` cannot be constructed by callers — the brand is
 * a module-private symbol. The only way to obtain one is
 * `assertPlatformOperator(session)`, which checks the server-controlled
 * platform-authority source. Cross-tenant service functions therefore cannot
 * be called at all without proving platform authority: the boundary is
 * enforced by the type system, not by remembering a guard.
 */

import { hasPlatformAuthority } from "./platform-authority";

const PLATFORM_OPERATOR_BRAND: unique symbol = Symbol(
  "dg.platformOperatorContext",
);

export interface PlatformOperatorContext {
  readonly [PLATFORM_OPERATOR_BRAND]: true;
  /** Clerk user id of the operator performing the action. */
  readonly actorId: string;
  /** Operator's active organisation (the DigitalGate operator org). */
  readonly operatorOrganisationId: string;
  readonly actorEmail?: string | null;
  readonly actorName?: string | null;
}

export type PlatformOperatorSessionLike = {
  clerkUserId: string;
  organisationId: string;
  role?: string | null;
  email?: string | null;
  name?: string | null;
};

/**
 * Returns a capability object when the session genuinely holds platform
 * authority, otherwise null. Callers must handle null with a 403.
 */
export function assertPlatformOperator(
  session: PlatformOperatorSessionLike | null | undefined,
): PlatformOperatorContext | null {
  if (!session) return null;

  if (
    !hasPlatformAuthority({
      organisationId: session.organisationId,
      role: session.role,
      // API-key sessions (`api_key:*`) can never mint an operator capability, so
      // no credential can drive a deliberately cross-tenant operation.
      principalId: session.clerkUserId,
    })
  ) {
    return null;
  }

  return {
    [PLATFORM_OPERATOR_BRAND]: true,
    actorId: session.clerkUserId,
    operatorOrganisationId: session.organisationId,
    actorEmail: session.email ?? null,
    actorName: session.name ?? null,
  };
}

/**
 * Runtime guard for defence in depth. The type system already prevents forging
 * the brand in TypeScript, but service functions crossing the tenant boundary
 * should still refuse malformed input arriving through `any`/JSON paths.
 */
export function isPlatformOperatorContext(
  value: unknown,
): value is PlatformOperatorContext {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<symbol, unknown>)[PLATFORM_OPERATOR_BRAND] === true
  );
}

/**
 * Pure write-entitlement policy (no framework imports) so it is unit-testable.
 *
 * The Next-dependent guard (src/lib/write-entitlement.ts) composes these with a
 * tenant subscription lookup and NextResponse construction.
 */

/** HTTP methods that mutate state and are subject to write-entitlement. */
export const WRITE_METHODS: ReadonlySet<string> = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

export function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}

/**
 * Recovery / billing / onboarding write endpoints that MUST stay reachable even
 * for a suspended (read-only) organisation, so it can pay, manage billing, or
 * finish onboarding and recover.
 *
 * EXACT paths only. Deliberately excludes `/api/v1/command/*` and
 * `/api/v1/admin/*` so those cannot become tenant-entitlement bypasses — those
 * surfaces are operator-scoped and platform operators are already exempt, while
 * any tenant-reachable write beneath them stays gated.
 */
export const WRITE_ENTITLEMENT_EXEMPT_PATHS: readonly string[] = [
  "/api/v1/billing/checkout",
  "/api/v1/billing/portal",
  "/api/v1/org/switch",
  "/api/v1/org/create",
  "/api/v1/onboarding/gen2",
  "/api/v1/founding/onboarding",
  "/api/v1/founding/onboarding/submit",
];

export function isWriteEntitlementExempt(pathname: string): boolean {
  return WRITE_ENTITLEMENT_EXEMPT_PATHS.includes(pathname);
}

/**
 * True when the request must consult the tenant's subscription entitlement.
 * False (skip) for reads, platform operators, and exempt recovery paths.
 */
export function shouldCheckTenantWriteEntitlement(input: {
  method: string;
  isPlatformOperator: boolean;
  pathname: string;
}): boolean {
  if (!isWriteMethod(input.method)) return false;
  if (input.isPlatformOperator) return false;
  if (isWriteEntitlementExempt(input.pathname)) return false;
  return true;
}

export type WriteBlock = { status: 403 | 503; code: string; message: string };

/**
 * Map a tenant write-entitlement result to a block spec, or null to allow.
 * `read_only` (suspended) → 403; `lookup_failed` (DB failure) → 503 fail closed.
 */
export function writeBlockFor(
  result:
    | { decision: "allow" }
    | { decision: "block"; reason: "read_only" | "lookup_failed" },
): WriteBlock | null {
  if (result.decision === "allow") return null;
  if (result.reason === "lookup_failed") {
    return {
      status: 503,
      code: "entitlement_unavailable",
      message:
        "Unable to verify subscription entitlement; writes are temporarily blocked.",
    };
  }
  return {
    status: 403,
    code: "entitlement_write_blocked",
    message:
      "This organisation's subscription is read-only. Update billing to resume changes.",
  };
}

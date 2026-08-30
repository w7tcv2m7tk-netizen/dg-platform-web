/**
 * Write-gate policy (H-3) — pure rules, no framework imports.
 *
 * Kept separate from `entitlement-gate.ts` so the policy can be unit tested
 * without pulling in `next/server`, and so the decision of *what* is gated
 * stays readable in one place.
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Paths that must keep working while an organisation cannot otherwise write,
 * because they are how it recovers, pays, or gets help. Prefix-matched; keep
 * each entry as specific as possible.
 *
 * Deliberately NOT exempt:
 *   /api/v1/command/*  — genuine operators pass via platform authority, and
 *                        /command/growth/* is a tenant-facing prospecting
 *                        surface that should be gated like any tenant write.
 *   /api/v1/admin/*    — same reasoning; operator authority is the gate.
 */
export const WRITE_GATE_EXEMPT_PREFIXES: readonly string[] = [
  // Pay, reactivate, change plan — the routes out of suspension.
  "/api/v1/billing/",
  "/api/v1/onboarding",
  // Signup / plan selection / founding onboarding.
  "/api/v1/founding/",
  // Move between organisations, or start a new one.
  "/api/v1/org/switch",
  "/api/v1/org/create",
  // Reach a human about the problem.
  "/api/v1/support/",
  // Demo tenant reset is not customer billing state.
  "/api/v1/demo/",
  // Partner programme membership is not tenant data.
  "/api/v1/partner/",
  "/api/v1/partners/",
];

export function isWriteGateExemptPath(pathname: string): boolean {
  return WRITE_GATE_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isMutatingMethod(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}

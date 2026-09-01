/**
 * Reusable tenant write-entitlement guard — the single source of truth for
 * "may this tenant perform a write right now?".
 *
 * Shared by every authenticated write surface: the `/api/v1` gate
 * (`enforceWriteEntitlement` in ./write-entitlement), the marketing SEO audit
 * Server Action, and the authenticated connector connect/callback routes. It
 * always runs the same `checkTenantWriteEntitlement` → `writeBlockFor` path, so
 * the block mapping (`read_only` → 403 `entitlement_write_blocked`,
 * `lookup_failed` → 503 `entitlement_unavailable`) can never diverge between
 * entry points.
 *
 * Framework-free (no `next/server`) so the decision stays unit-testable; the
 * HTTP response/redirect wrappers live in the callers.
 */
import { checkTenantWriteEntitlement } from "@dg/platform-core/billing/entitlement-resolver";
import { hasPlatformAuthority } from "@dg/platform-core/access/platform-authority";

import { writeBlockFor, type WriteBlock } from "@/lib/write-entitlement-policy";

/**
 * A tenant actor for a write. Full PlatformSessions satisfy this; callers that
 * only know the tenant organisation (e.g. an OAuth callback carrying a signed
 * `organisationId`) may pass just `{ organisationId }`.
 */
export type TenantWriteEntitlementActor = {
  organisationId: string;
  role?: string | null;
  clerkUserId?: string | null;
};

/**
 * Decide whether a tenant write must be blocked. Returns a `WriteBlock` to deny,
 * or `null` to allow.
 *
 * Platform operators are not tenants (C-2) and are never blocked; the API-key
 * clamp applies so a credential cannot inherit that exemption. The optional
 * `fetchSubscription` mirrors `checkTenantWriteEntitlement` for testing.
 */
export async function tenantWriteEntitlementBlock(
  actor: TenantWriteEntitlementActor,
  fetchSubscription?: Parameters<typeof checkTenantWriteEntitlement>[1],
): Promise<WriteBlock | null> {
  if (
    hasPlatformAuthority({
      organisationId: actor.organisationId,
      role: actor.role,
      principalId: actor.clerkUserId,
    })
  ) {
    return null;
  }
  return writeBlockFor(
    await checkTenantWriteEntitlement(actor.organisationId, fetchSubscription),
  );
}

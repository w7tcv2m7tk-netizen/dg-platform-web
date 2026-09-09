import {
  buildAccessContext,
  hasPermission,
  type PermissionAction,
  type PlatformSession,
} from "@dg/platform-core";

/**
 * Website Studio operates on organisation-owned website records. Until there is
 * a first-class website assignment model, every Studio operation must require
 * organisation-scope website permission rather than relying on membership +
 * entitlement alone.
 */
export function canAccessWebsiteStudio(
  session: Pick<
    PlatformSession,
    "role" | "organisationId" | "clerkUserId" | "permissionGrants"
  >,
  action: PermissionAction,
): boolean {
  const ctx = buildAccessContext({
    role: session.role,
    organisationId: session.organisationId,
    principalId: session.clerkUserId,
    enabledAppIds: [],
    grants: session.permissionGrants,
  });

  return hasPermission(ctx, {
    module: "websites",
    action,
    scope: "organisation",
  });
}

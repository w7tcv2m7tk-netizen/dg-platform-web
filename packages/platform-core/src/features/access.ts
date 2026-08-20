import type { PlatformSession } from "../session";
import {
  buildAccessContext,
  featureIdToPermissionCheck,
  hasPermission,
} from "../access/evaluate";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/** Platform 1.0 — role + permission grants (membership.permissions). */
export function sessionHasFeature(
  session: PlatformSession,
  featureId: string,
): boolean {
  if (ADMIN_ROLES.has(session.role) || session.role === "dg:staff") {
    // Admins still go through hard denies for platform_admin on customer orgs
    const check = featureIdToPermissionCheck(featureId);
    if (!check) return true;
    const ctx = buildAccessContext({
      role: session.role,
      organisationSlug: session.organisationSlug,
      email: session.email,
      enabledAppIds: [],
      grants: session.permissionGrants,
    });
    return hasPermission(ctx, check);
  }

  const check = featureIdToPermissionCheck(featureId);
  if (!check) {
    // Unknown feature — members only get *.read
    return featureId.endsWith(".read") || featureId === "crm.timeline.read";
  }

  const ctx = buildAccessContext({
    role: session.role,
    organisationSlug: session.organisationSlug,
    email: session.email,
    enabledAppIds: [],
    grants: session.permissionGrants,
  });

  if (featureId.endsWith(".read") || featureId === "crm.timeline.read") {
    return hasPermission(ctx, { ...check, action: "view" });
  }

  return hasPermission(ctx, check);
}

export function featureDeniedMessage(featureId: string) {
  return `Your role does not allow this action (${featureId}). Ask an organisation owner.`;
}

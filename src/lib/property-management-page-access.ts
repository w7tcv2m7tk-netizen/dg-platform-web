import {
  buildAccessContext,
  hasPermission,
  type PlatformSession,
} from "@dg/platform-core";

export function canManagePropertyManagement(session: PlatformSession): boolean {
  const context = buildAccessContext({
    role: session.role,
    organisationId: session.organisationId,
    principalId: session.clerkUserId,
    enabledAppIds: ["property-management"],
    grants: session.permissionGrants,
    industryAppId: "property-management",
  });

  return hasPermission(context, {
    module: "industry",
    action: "edit",
    scope: "organisation",
    subModule: "property-management",
  });
}

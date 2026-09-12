import {
  buildAccessContext,
  hasPermission,
  type PlatformSession,
} from "@dg/platform-core";

export function canManageCommercial(session: PlatformSession): boolean {
  const context = buildAccessContext({
    role: session.role,
    organisationId: session.organisationId,
    principalId: session.clerkUserId,
    enabledAppIds: ["commercial"],
    grants: session.permissionGrants,
    industryAppId: "commercial",
  });

  return hasPermission(context, {
    module: "industry",
    action: "edit",
    scope: "organisation",
    subModule: "commercial",
  });
}

import {
  buildAccessContext,
  hasPermission,
  type PlatformSession,
} from "@dg/platform-core";

export function canManageFinance(session: PlatformSession): boolean {
  const context = buildAccessContext({
    role: session.role,
    organisationId: session.organisationId,
    principalId: session.clerkUserId,
    enabledAppIds: ["finance"],
    grants: session.permissionGrants,
    industryAppId: "finance",
  });

  return hasPermission(context, {
    module: "industry",
    action: "edit",
    scope: "organisation",
    subModule: "finance",
  });
}

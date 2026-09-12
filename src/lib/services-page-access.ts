import {
  buildAccessContext,
  hasPermission,
  type PlatformSession,
} from "@dg/platform-core";

export function canManageServices(session: PlatformSession): boolean {
  const context = buildAccessContext({
    role: session.role,
    organisationId: session.organisationId,
    principalId: session.clerkUserId,
    enabledAppIds: ["services"],
    grants: session.permissionGrants,
    industryAppId: "services",
  });

  return hasPermission(context, {
    module: "industry",
    action: "edit",
    scope: "organisation",
    subModule: "services",
  });
}

export function canConfigureServices(session: PlatformSession): boolean {
  const context = buildAccessContext({
    role: session.role,
    organisationId: session.organisationId,
    principalId: session.clerkUserId,
    enabledAppIds: ["services"],
    grants: session.permissionGrants,
    industryAppId: "services",
  });

  return hasPermission(context, {
    module: "industry",
    action: "manage",
    scope: "organisation",
    subModule: "services",
  });
}

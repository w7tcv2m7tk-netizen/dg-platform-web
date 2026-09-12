import {
  buildAccessContext,
  hasPermission,
  type PlatformSession,
} from "@dg/platform-core";

function contextFor(session: PlatformSession) {
  return buildAccessContext({
    role: session.role,
    organisationId: session.organisationId,
    principalId: session.clerkUserId,
    enabledAppIds: ["real-estate"],
    grants: session.permissionGrants,
    industryAppId: "real-estate",
  });
}

export function canManageRealEstate(session: PlatformSession): boolean {
  return hasPermission(contextFor(session), {
    module: "industry",
    action: "edit",
    scope: "organisation",
    subModule: "real-estate",
  });
}

export function canCreateOrganisationLeads(session: PlatformSession): boolean {
  return hasPermission(contextFor(session), {
    module: "crm",
    action: "create",
    scope: "organisation",
  });
}

export function canEditOrganisationLeads(session: PlatformSession): boolean {
  return hasPermission(contextFor(session), {
    module: "crm",
    action: "edit",
    scope: "organisation",
  });
}

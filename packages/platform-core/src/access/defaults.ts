/**
 * Default permission matrix by organisation role.
 * Explicit grants on membership.permissions can add; denies override.
 */

import type {
  OrganisationRole,
  PermissionAction,
  PermissionGrant,
  PermissionModule,
  PermissionScope,
  PlatformUserType,
} from "./roles";

const ALL_ACTIONS: PermissionAction[] = [
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "manage",
  "approve",
  "assign",
];

const OPERATIONAL_MODULES: PermissionModule[] = [
  "crm",
  "commerce",
  "documents",
  "communications",
  "websites",
  "infrastructure",
  "industry",
  "growth",
  "intelligence",
];

function grants(
  modules: PermissionModule[],
  actions: PermissionAction[],
  scope: PermissionScope,
): PermissionGrant[] {
  const out: PermissionGrant[] = [];
  for (const module of modules) {
    for (const action of actions) {
      out.push({ module, action, scope });
    }
  }
  return out;
}

/** Baseline grants — evaluated before membership override grants. */
export function defaultGrantsForOrganisationRole(
  role: OrganisationRole,
): PermissionGrant[] {
  if (role === "organisation_owner") {
    return [
      ...grants(OPERATIONAL_MODULES, ALL_ACTIONS, "organisation"),
      ...grants(["team", "billing", "settings"], ALL_ACTIONS, "organisation"),
    ];
  }

  if (role === "organisation_admin") {
    return [
      ...grants(OPERATIONAL_MODULES, ALL_ACTIONS, "organisation"),
      ...grants(["team", "settings"], ["view", "create", "edit", "assign", "manage"], "organisation"),
      ...grants(["billing"], ["view"], "organisation"),
    ];
  }

  // Member — operational on assigned records; no billing / team admin / settings manage
  return [
    ...grants(
      ["crm", "industry", "growth", "intelligence", "websites", "documents", "communications"],
      ["view", "create", "edit"],
      "assigned",
    ),
    ...grants(
      ["crm", "industry", "growth", "intelligence", "documents", "communications"],
      ["view"],
      "organisation",
    ),
    ...grants(["commerce"], ["view", "create"], "assigned"),
    ...grants(["settings"], ["view"], "own"),
    ...grants(["team"], ["view"], "organisation"),
  ];
}

export function defaultGrantsForPlatformUserType(
  type: PlatformUserType,
): PermissionGrant[] {
  if (type === "digitalgate_owner") {
    return [
      ...grants(
        [...OPERATIONAL_MODULES, "team", "billing", "settings", "partners", "delivery", "platform_admin"],
        ALL_ACTIONS,
        "organisation",
      ),
    ];
  }

  if (type === "digitalgate_admin") {
    return [
      ...grants(OPERATIONAL_MODULES, ALL_ACTIONS, "organisation"),
      ...grants(["partners", "delivery", "intelligence"], ALL_ACTIONS, "organisation"),
      ...grants(["team", "settings"], ["view", "edit", "manage", "assign"], "organisation"),
      ...grants(["billing"], ["view"], "organisation"),
    ];
  }

  return [
    ...grants(["crm", "intelligence", "delivery"], ["view", "edit", "create"], "assigned"),
    ...grants(["partners"], ["view"], "assigned"),
    ...grants(["settings"], ["view"], "own"),
  ];
}

/** Hard denies that grants cannot override (except digitalgate_owner). */
export function hardDeniesForOrganisationRole(role: OrganisationRole): string[] {
  if (role === "organisation_owner") return ["platform_admin"];
  if (role === "organisation_admin") {
    return ["transfer_ownership", "delete_organisation", "platform_admin"];
  }
  return [
    "billing.manage",
    "billing.delete",
    "team.manage",
    "team.delete",
    "subscription_manage",
    "transfer_ownership",
    "delete_organisation",
    "platform_admin",
  ];
}

/**
 * Permission evaluation — API/data layer source of truth.
 */

import {
  defaultGrantsForOrganisationRole,
  defaultGrantsForPlatformUserType,
  hardDeniesForOrganisationRole,
} from "./defaults";
import {
  normalizeMembershipRole,
  toOrganisationRole,
  toPlatformUserType,
} from "./membership-role";
import type {
  AccessContext,
  PermissionAction,
  PermissionGrant,
  PermissionModule,
  PermissionScope,
} from "./roles";

const SCOPE_RANK: Record<PermissionScope, number> = {
  own: 1,
  assigned: 2,
  team: 3,
  organisation: 4,
};

export type PermissionCheck = {
  module: PermissionModule;
  action: PermissionAction;
  /** Required minimum scope — defaults to assigned for members, organisation for admins */
  scope?: PermissionScope;
  subModule?: string;
};

export function parsePermissionGrants(raw: unknown): PermissionGrant[] {
  if (!Array.isArray(raw)) return [];
  const out: PermissionGrant[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const g = item as Record<string, unknown>;
    if (typeof g.module !== "string" || typeof g.action !== "string") continue;
    if (typeof g.scope !== "string") continue;
    out.push({
      module: g.module as PermissionGrant["module"],
      action: g.action as PermissionGrant["action"],
      scope: g.scope as PermissionGrant["scope"],
      subModule: typeof g.subModule === "string" ? g.subModule : undefined,
    });
  }
  return out;
}

/**
 * Build the permission-evaluation context for a session.
 *
 * `organisationId` is the tenant id from the authenticated session. It is the
 * only organisation input used for platform authority; organisation name/slug
 * is tenant-editable and is deliberately not accepted here.
 */
export function buildAccessContext(input: {
  role: string;
  organisationId?: string | null;
  /**
   * Optional server-resolved platform-authority result. Pass on the client
   * (where the DG_COMMAND_CENTRE_ORG_IDS allowlist is not readable) so the
   * navigation context matches the server render. Omit on the server, where
   * authority is derived from the allowlist / dg:staff.
   */
  isPlatformOperator?: boolean;
  enabledAppIds: string[];
  grants?: PermissionGrant[] | unknown;
  industryAppId?: string | null;
  templateId?: string | null;
  partnerCapabilities?: AccessContext["partnerCapabilities"];
}): AccessContext {
  return {
    organisationRole: toOrganisationRole(input.role),
    platformUserType: toPlatformUserType({
      role: input.role,
      organisationId: input.organisationId,
      hasAuthority: input.isPlatformOperator,
    }),
    enabledAppIds: input.enabledAppIds,
    grants: parsePermissionGrants(input.grants),
    industryAppId: input.industryAppId,
    templateId: input.templateId,
    partnerCapabilities: input.partnerCapabilities,
  };
}

function grantMatches(
  grant: PermissionGrant,
  check: PermissionCheck,
): boolean {
  if (grant.module !== check.module) return false;
  if (grant.action !== check.action) return false;
  if (check.subModule && grant.subModule && grant.subModule !== check.subModule) {
    return false;
  }
  const needed = check.scope ?? "assigned";
  return SCOPE_RANK[grant.scope] >= SCOPE_RANK[needed];
}

function collectEffectiveGrants(ctx: AccessContext): PermissionGrant[] {
  const base: PermissionGrant[] = [];
  if (ctx.platformUserType) {
    base.push(...defaultGrantsForPlatformUserType(ctx.platformUserType));
  }
  if (ctx.organisationRole) {
    base.push(...defaultGrantsForOrganisationRole(ctx.organisationRole));
  }
  if (ctx.grants?.length) base.push(...ctx.grants);
  return base;
}

/**
 * True when the access context allows the action at the required scope.
 */
export function hasPermission(
  ctx: AccessContext,
  check: PermissionCheck,
): boolean {
  const role = ctx.organisationRole ?? "organisation_member";
  const denyKey = `${check.module}.${check.action}`;
  const hard = hardDeniesForOrganisationRole(role);

  if (ctx.platformUserType === "digitalgate_owner") {
    return true;
  }

  if (hard.includes(denyKey) || hard.includes(check.module) || hard.includes(`${check.module}.manage`)) {
    // Members hard-deny billing.manage etc.
    if (role === "organisation_member") {
      if (
        check.module === "billing" &&
        (check.action === "manage" || check.action === "delete" || check.action === "approve")
      ) {
        return false;
      }
      if (check.module === "team" && (check.action === "manage" || check.action === "delete")) {
        return false;
      }
      if (check.module === "platform_admin") return false;
    }
    if (role === "organisation_admin" && check.module === "platform_admin") return false;
  }

  const grants = collectEffectiveGrants(ctx);
  return grants.some((g) => grantMatches(g, check));
}

/** Convenience for session-shaped callers. */
export function sessionCan(
  session: {
    role: string;
    organisationId?: string;
    permissionGrants?: unknown;
  },
  check: PermissionCheck,
  enabledAppIds: string[] = [],
): boolean {
  const ctx = buildAccessContext({
    role: session.role,
    organisationId: session.organisationId,
    enabledAppIds,
    grants: session.permissionGrants,
  });
  return hasPermission(ctx, check);
}

/**
 * Map legacy feature ids (crm.contacts.write) → permission checks.
 */
export function featureIdToPermissionCheck(featureId: string): PermissionCheck | null {
  const parts = featureId.split(".");
  if (parts.length < 2) return null;

  const [head, ...rest] = parts;
  const tail = rest[rest.length - 1] ?? "view";

  const moduleMap: Record<string, PermissionModule> = {
    crm: "crm",
    commerce: "commerce",
    documents: "documents",
    communications: "communications",
    /** Feature ids use `comms.*`; map to Core Communications module */
    comms: "communications",
    websites: "websites",
    infrastructure: "infrastructure",
    services: "industry",
    "real-estate": "industry",
    accommodation: "industry",
    finance: "industry",
    automotive: "industry",
    creator: "industry",
    seo: "growth",
    "ai-visibility": "growth",
    automation: "growth",
    analytics: "growth",
    social: "growth",
    reviews: "growth",
    /** Legacy key — advanced comms live under Core Communications (voice_ai) */
    "ai-communications": "communications",
    command: "intelligence",
    twin: "intelligence",
    advisor: "intelligence",
    billing: "billing",
    team: "team",
    settings: "settings",
    partners: "partners",
    delivery: "delivery",
  };

  const module = moduleMap[head];
  if (!module) return null;

  let action: PermissionAction = "view";
  if (tail === "read" || tail === "view") action = "view";
  else if (tail === "write" || tail === "create") action = "create";
  else if (tail === "update" || tail === "edit") action = "edit";
  else if (tail === "delete" || tail === "remove") action = "delete";
  else if (tail === "manage" || tail === "admin") action = "manage";
  else if (tail === "export") action = "export";
  else if (tail === "approve") action = "approve";
  else if (tail === "assign") action = "assign";
  else if (rest.includes("write") || rest.includes("create")) action = "create";
  else if (rest.includes("delete")) action = "delete";
  else if (rest.includes("manage")) action = "manage";

  return {
    module,
    action,
    scope: action === "view" ? "organisation" : "assigned",
    subModule: rest.length > 1 ? rest.slice(0, -1).join(".") : undefined,
  };
}

export function membershipRoleLabel(role: string): string {
  const r = normalizeMembershipRole(role);
  if (r === "owner") return "Organisation Owner";
  if (r === "admin") return "Organisation Admin";
  if (r === "dg:staff") return "DigitalGate Staff";
  return "Organisation Member";
}

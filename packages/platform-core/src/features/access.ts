import type { PlatformSession } from "../session";
import {
  buildAccessContext,
  featureIdToPermissionCheck,
  hasPermission,
} from "../access/evaluate";
import {
  COMMERCIAL_BETA_FLAG,
  FINANCE_BETA_FLAG,
  PM_BETA_FLAG,
  SERVICES_BETA_FLAG,
} from "../industry/beta-gates";
import { organisationHasFlag } from "./flags";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/** Platform 1.0 — role + permission grants (membership.permissions). */
export function sessionHasFeature(
  session: PlatformSession,
  featureId: string,
): boolean {
  if (ADMIN_ROLES.has(session.role) || session.role === "dg:staff") {
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

/** Industry app id → beta feature flag. */
export const INDUSTRY_APP_BETA_FLAGS: Record<string, string> = {
  "property-management": PM_BETA_FLAG,
  commercial: COMMERCIAL_BETA_FLAG,
  services: SERVICES_BETA_FLAG,
  finance: FINANCE_BETA_FLAG,
};

export async function organisationHasIndustryAppBeta(
  organisationId: string,
  appId: string,
): Promise<boolean> {
  const flag = INDUSTRY_APP_BETA_FLAGS[appId];
  if (!flag) return true;
  return organisationHasFlag(organisationId, flag);
}

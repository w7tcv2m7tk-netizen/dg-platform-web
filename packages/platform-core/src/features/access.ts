import type { PlatformSession } from "../session";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/** Platform 1.0 — role-based feature gate until per-membership grants ship. */
export function sessionHasFeature(
  session: PlatformSession,
  featureId: string,
): boolean {
  if (ADMIN_ROLES.has(session.role)) {
    return true;
  }

  if (featureId.endsWith(".read") || featureId === "crm.timeline.read") {
    return true;
  }

  return false;
}

export function featureDeniedMessage(featureId: string) {
  return `Your role (${featureId}) does not allow this action. Ask an organisation owner.`;
}

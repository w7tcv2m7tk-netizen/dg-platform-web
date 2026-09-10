import { getCompany } from "../companies";
import { getContact } from "../contacts";
import { getOpportunity } from "../opportunities";
import { getServiceJob } from "../services/jobs";

export const TASK_LINK_ENTITY_TYPES = [
  "Contact",
  "Company",
  "Opportunity",
  "ServiceJob",
] as const;

export type TaskLinkEntityType = (typeof TASK_LINK_ENTITY_TYPES)[number];

export type TaskLinkErrorCode =
  | "validation_error"
  | "unsupported_entity_type"
  | "linked_contact_not_found"
  | "linked_company_not_found"
  | "linked_opportunity_not_found"
  | "linked_job_not_found";

export type TaskLinkTargetResult =
  | { ok: true; entityType: TaskLinkEntityType }
  | { ok: false; code: TaskLinkErrorCode; message: string };

export function isTaskLinkEntityType(value: string): value is TaskLinkEntityType {
  return (TASK_LINK_ENTITY_TYPES as readonly string[]).includes(value);
}

/** Pair rule used by the Tasks API — both present or both omitted. */
export function taskLinkPairError(
  entityType?: string | null,
  entityId?: string | null,
): Extract<TaskLinkTargetResult, { ok: false }> | null {
  const type = typeof entityType === "string" ? entityType.trim() : "";
  const id = typeof entityId === "string" ? entityId.trim() : "";
  if (!type && !id) return null;
  if (Boolean(type) !== Boolean(id)) {
    return {
      ok: false,
      code: "validation_error",
      message: "entityType and entityId must be supplied together",
    };
  }
  return null;
}

/**
 * Organisation-scoped linked-target lookup. Session/permission checks stay
 * at the authenticated API boundary.
 */
export async function resolveTaskLinkTarget(
  organisationId: string,
  entityType: string,
  entityId: string,
): Promise<TaskLinkTargetResult> {
  if (!isTaskLinkEntityType(entityType)) {
    return {
      ok: false,
      code: "unsupported_entity_type",
      message: "Tasks cannot be linked to this entity type",
    };
  }

  if (entityType === "Contact") {
    const record = await getContact(organisationId, entityId);
    return record
      ? { ok: true, entityType }
      : {
          ok: false,
          code: "linked_contact_not_found",
          message: "Linked contact not found",
        };
  }

  if (entityType === "Company") {
    const record = await getCompany(organisationId, entityId);
    return record
      ? { ok: true, entityType }
      : {
          ok: false,
          code: "linked_company_not_found",
          message: "Linked company not found",
        };
  }

  if (entityType === "Opportunity") {
    const record = await getOpportunity(organisationId, entityId);
    return record
      ? { ok: true, entityType }
      : {
          ok: false,
          code: "linked_opportunity_not_found",
          message: "Linked opportunity not found",
        };
  }

  const record = await getServiceJob(organisationId, entityId);
  return record
    ? { ok: true, entityType }
    : {
        ok: false,
        code: "linked_job_not_found",
        message: "Linked job not found",
      };
}

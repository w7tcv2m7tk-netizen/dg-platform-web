import type { Prisma } from "@dg/database";

/**
 * Contact-centric RE roles (Vendor / Buyer are badges on Contact — not people objects).
 * @see docs/foundations/CONTACTS-AND-APP-ROLES.md
 */
export type ReContactRole = "vendor" | "buyer";

const ROLE_TAG: Record<ReContactRole, string> = {
  vendor: "vendor",
  buyer: "buyer",
};

function parseTags(tags: string | null | undefined): string[] {
  if (!tags?.trim()) return [];
  return tags
    .split(/[,|]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function serializeTags(tags: string[]): string {
  return [...new Set(tags)].join(", ");
}

/**
 * Ensure Contact carries the Vendor or Buyer role badge (tags + metadata.appRoles).
 * Does not create a parallel person record.
 */
export async function ensureReContactRole(input: {
  organisationId: string;
  contactId: string;
  role: ReContactRole;
}): Promise<void> {
  const { prisma } = await import("@dg/database");
  const contact = await prisma.contact.findFirst({
    where: {
      id: input.contactId,
      organisationId: input.organisationId,
      deletedAt: null,
    },
  });
  if (!contact) return;

  const tags = parseTags(contact.tags);
  const roleTag = ROLE_TAG[input.role];
  const nextTags = tags.includes(roleTag) ? tags : [...tags, roleTag];

  const metadata = (contact.metadata as Record<string, unknown> | null) ?? {};
  const appRoles = {
    ...((metadata.appRoles as Record<string, unknown> | undefined) ?? {}),
    [input.role]: true,
  };

  const tagsChanged = serializeTags(nextTags) !== (contact.tags ?? "");
  const rolesBefore = JSON.stringify(metadata.appRoles ?? {});
  const rolesAfter = JSON.stringify(appRoles);
  if (!tagsChanged && rolesBefore === rolesAfter) return;

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      tags: serializeTags(nextTags),
      metadata: { ...metadata, appRoles } as Prisma.InputJsonValue,
    },
  });
}

export function contactHasReRole(
  contact: { tags?: string | null; metadata?: Record<string, unknown> | null },
  role: ReContactRole,
): boolean {
  const tags = parseTags(contact.tags);
  if (tags.includes(ROLE_TAG[role])) return true;
  const appRoles = contact.metadata?.appRoles as Record<string, unknown> | undefined;
  return Boolean(appRoles?.[role]);
}

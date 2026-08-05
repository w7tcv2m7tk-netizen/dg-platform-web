import type { Contact, Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";

export interface CreateContactInput {
  organisationId: string;
  actorId?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  tags?: string;
  companyId?: string;
}

export interface UpdateContactInput {
  organisationId: string;
  contactId: string;
  actorId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  tags?: string;
  status?: string;
}

export interface ListContactsOptions {
  organisationId: string;
  search?: string;
  limit?: number;
  offset?: number;
}

function serializeContact(contact: Contact) {
  return {
    id: contact.id,
    organisationId: contact.organisationId,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    status: contact.status,
    source: contact.source,
    tags: contact.tags,
    companyId: contact.companyId,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

export async function listContacts(options: ListContactsOptions) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = options.offset ?? 0;

  const where: Prisma.ContactWhereInput = {
    organisationId: options.organisationId,
    deletedAt: null,
  };

  if (options.search?.trim()) {
    const q = options.search.trim();
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    items: items.map(serializeContact),
    meta: { total, limit, offset },
  };
}

export async function getContact(organisationId: string, contactId: string) {
  const { prisma } = await import("@dg/database");

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organisationId, deletedAt: null },
  });

  return contact ? serializeContact(contact) : null;
}

export async function createContact(input: CreateContactInput) {
  const { prisma } = await import("@dg/database");

  const contact = await prisma.contact.create({
    data: {
      organisationId: input.organisationId,
      firstName: input.firstName.trim(),
      lastName: input.lastName?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
      source: input.source?.trim() || "manual",
      tags: input.tags?.trim() || null,
      companyId: input.companyId || null,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Contact",
      entityId: contact.id,
      activityType: "created",
      title: "Contact created",
      body: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      sourceApp: "crm",
      createdBy: input.actorId,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "Contact",
    entityId: contact.id,
    changes: { after: serializeContact(contact) },
  });

  await platformEvents.publish({
    type: "contact.created",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Contact",
    entityId: contact.id,
    payload: { firstName: contact.firstName, email: contact.email },
    occurredAt: new Date(),
  });

  return serializeContact(contact);
}

export async function updateContact(input: UpdateContactInput) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.contact.findFirst({
    where: {
      id: input.contactId,
      organisationId: input.organisationId,
      deletedAt: null,
    },
  });
  if (!existing) return null;

  const data: Prisma.ContactUpdateInput = {};
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  if (input.firstName !== undefined) {
    const next = input.firstName.trim();
    if (next !== existing.firstName) {
      changes.firstName = { before: existing.firstName, after: next };
      data.firstName = next;
    }
  }
  if (input.lastName !== undefined) {
    const next = input.lastName.trim() || null;
    if (next !== existing.lastName) {
      changes.lastName = { before: existing.lastName, after: next };
      data.lastName = next;
    }
  }
  if (input.email !== undefined) {
    const next = input.email.trim().toLowerCase() || null;
    if (next !== existing.email) {
      changes.email = { before: existing.email, after: next };
      data.email = next;
    }
  }
  if (input.phone !== undefined) {
    const next = input.phone.trim() || null;
    if (next !== existing.phone) {
      changes.phone = { before: existing.phone, after: next };
      data.phone = next;
    }
  }
  if (input.source !== undefined) {
    const next = input.source.trim() || "manual";
    if (next !== existing.source) {
      changes.source = { before: existing.source, after: next };
      data.source = next;
    }
  }
  if (input.tags !== undefined) {
    const next = input.tags.trim() || null;
    if (next !== existing.tags) {
      changes.tags = { before: existing.tags, after: next };
      data.tags = next;
    }
  }
  if (input.status !== undefined && input.status !== existing.status) {
    changes.status = { before: existing.status, after: input.status };
    data.status = input.status;
  }

  if (Object.keys(data).length === 0) {
    return serializeContact(existing);
  }

  const contact = await prisma.contact.update({
    where: { id: input.contactId },
    data,
  });

  const changedFields = Object.keys(changes).join(", ");

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Contact",
      entityId: contact.id,
      activityType: "updated",
      title: "Contact updated",
      body: changedFields,
      sourceApp: "crm",
      createdBy: input.actorId,
      metadata: { changes } as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "Contact",
    entityId: contact.id,
    changes: changes as unknown as Prisma.InputJsonValue,
  });

  await platformEvents.publish({
    type: "contact.updated",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Contact",
    entityId: contact.id,
    payload: { fields: Object.keys(changes) },
    occurredAt: new Date(),
  });

  return serializeContact(contact);
}

export async function listContactActivities(organisationId: string, contactId: string) {
  const { prisma } = await import("@dg/database");

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organisationId, deletedAt: null },
  });
  if (!contact) return null;

  const activities = await prisma.activity.findMany({
    where: {
      organisationId,
      entityType: "Contact",
      entityId: contactId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return activities.map((a) => ({
    id: a.id,
    activityType: a.activityType,
    title: a.title,
    body: a.body,
    sourceApp: a.sourceApp,
    createdBy: a.createdBy,
    createdAt: a.createdAt.toISOString(),
  }));
}

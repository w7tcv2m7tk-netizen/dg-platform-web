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
  companyId?: string | null;
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

/**
 * Find-or-create Contact from lead form fields so manual create mirrors WP sync.
 * Requires at least a name, email, or phone — otherwise returns null.
 */
export async function ensureContactForLeadFields(input: {
  organisationId: string;
  actorId?: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
}): Promise<{ id: string; created: boolean } | null> {
  const email = input.email?.trim().toLowerCase() || "";
  const phone = input.phone?.trim() || "";
  const name = input.name?.trim() || "";
  if (!email && !phone && !name) return null;

  const { prisma } = await import("@dg/database");

  if (email) {
    const existing = await prisma.contact.findFirst({
      where: { organisationId: input.organisationId, email, deletedAt: null },
    });
    if (existing) {
      const patch: Prisma.ContactUpdateInput = {};
      if (phone && !existing.phone) patch.phone = phone;
      if (name) {
        const parts = name.split(/\s+/);
        const first = parts[0] ?? "";
        const last = parts.slice(1).join(" ") || null;
        if (first && existing.firstName === "Unknown") patch.firstName = first;
        if (last && !existing.lastName) patch.lastName = last;
      }
      if (Object.keys(patch).length > 0) {
        await prisma.contact.update({ where: { id: existing.id }, data: patch });
      }
      return { id: existing.id, created: false };
    }
  }

  const parts = name.split(/\s+/).filter(Boolean);
  const created = await createContact({
    organisationId: input.organisationId,
    actorId: input.actorId,
    firstName: parts[0] || (email ? email.split("@")[0] : "Unknown"),
    lastName: parts.slice(1).join(" ") || undefined,
    email: email || undefined,
    phone: phone || undefined,
    source: input.source ?? "manual",
  });
  return { id: created.id, created: true };
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
  if (input.companyId !== undefined && input.companyId !== existing.companyId) {
    changes.companyId = { before: existing.companyId, after: input.companyId };
    data.company = input.companyId
      ? { connect: { id: input.companyId } }
      : { disconnect: true };
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

export interface ImportContactRow {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  tags?: string;
}

export async function exportContactsCsv(organisationId: string) {
  const { prisma } = await import("@dg/database");

  const contacts = await prisma.contact.findMany({
    where: { organisationId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });

  const header = "firstName,lastName,email,phone,source,tags,status,createdAt";
  const rows = contacts.map((c) =>
    [
      csvEscape(c.firstName),
      csvEscape(c.lastName ?? ""),
      csvEscape(c.email ?? ""),
      csvEscape(c.phone ?? ""),
      csvEscape(c.source ?? ""),
      csvEscape(c.tags ?? ""),
      csvEscape(c.status),
      csvEscape(c.createdAt.toISOString()),
    ].join(","),
  );

  return [header, ...rows].join("\n");
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

export async function importContactsFromCsv(
  organisationId: string,
  csv: string,
  actorId?: string,
) {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { imported: 0, skipped: 0, errors: ["CSV must include a header row and at least one contact"] };
  }

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const firstNameIdx = header.indexOf("firstname");
  if (firstNameIdx < 0) {
    return { imported: 0, skipped: 0, errors: ["CSV must include a firstName column"] };
  }

  const col = (name: string) => header.indexOf(name.toLowerCase());
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const firstName = cells[firstNameIdx]?.trim();
    if (!firstName) {
      skipped += 1;
      continue;
    }

    try {
      await createContact({
        organisationId,
        actorId,
        firstName,
        lastName: cells[col("lastname")]?.trim() || undefined,
        email: cells[col("email")]?.trim() || undefined,
        phone: cells[col("phone")]?.trim() || undefined,
        source: cells[col("source")]?.trim() || "import",
        tags: cells[col("tags")]?.trim() || undefined,
      });
      imported += 1;
    } catch {
      errors.push(`Row ${i + 1}: failed to import ${firstName}`);
      skipped += 1;
    }
  }

  if (imported > 0) {
    await writeAuditLog({
      organisationId,
      actorId,
      action: "create",
      entityType: "Contact",
      entityId: "bulk-import",
      changes: { imported, skipped } as unknown as Prisma.InputJsonValue,
    });
  }

  return { imported, skipped, errors };
}

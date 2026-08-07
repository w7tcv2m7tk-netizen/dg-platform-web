import type { Prisma } from "@dg/database";

import { enrichLeadAddressMetadata, resolveAddress } from "../../addresses";
import { createContact } from "../../contacts";
import { createLead } from "../../leads";

export interface WpVendorLead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  property_address?: string;
  source?: string;
  stage?: string;
  status?: string;
  created_at?: string;
}

export interface SyncVendorLeadsInput {
  organisationId: string;
  actorId?: string;
  leads: WpVendorLead[];
}

export interface SyncVendorLeadsResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function buildLeadMetadata(wpLead: WpVendorLead, rawAddress: string) {
  let leadMetadata: Record<string, unknown> = {
    lead_type: "vendor",
    stage: wpLead.stage ?? "vendor_lead",
    property_address: rawAddress || undefined,
    wp_name: wpLead.name,
  };

  return { leadMetadata, rawAddress };
}

async function resolveLeadMetadata(
  wpLead: WpVendorLead,
): Promise<{ leadMetadata: Record<string, unknown>; title: string }> {
  const rawAddress = wpLead.property_address?.trim() ?? "";
  const { leadMetadata } = buildLeadMetadata(wpLead, rawAddress);

  let metadata = leadMetadata;
  if (rawAddress) {
    const resolved = await resolveAddress(rawAddress, { geocode: true });
    metadata = enrichLeadAddressMetadata(metadata, resolved);
  }

  const title =
    (metadata.property_formatted as string | undefined) ??
    (rawAddress || wpLead.name?.trim() || `Vendor lead #${wpLead.id}`);

  return { leadMetadata: metadata, title };
}

async function resolveContactId(
  organisationId: string,
  actorId: string | undefined,
  wpLead: WpVendorLead,
): Promise<string | undefined> {
  const email = wpLead.email?.trim().toLowerCase();
  if (!email) return undefined;

  const { prisma } = await import("@dg/database");
  const existingContact = await prisma.contact.findFirst({
    where: { organisationId, email, deletedAt: null },
  });
  if (existingContact) return existingContact.id;

  const parts = wpLead.name.trim().split(/\s+/);
  const created = await createContact({
    organisationId,
    actorId,
    firstName: parts[0] ?? "Unknown",
    lastName: parts.slice(1).join(" ") || undefined,
    email,
    phone: wpLead.phone,
    source: wpLead.source ?? "wordpress",
  });
  return created.id;
}

async function applyVendorRole(organisationId: string, contactId: string | undefined) {
  if (!contactId) return;
  const { ensureReContactRole } = await import("../../real-estate/contact-roles");
  await ensureReContactRole({ organisationId, contactId, role: "vendor" });
}

/** Idempotent sync — creates new leads or updates existing WP imports. */
export async function syncVendorLeadsFromWordPress(
  input: SyncVendorLeadsInput,
): Promise<SyncVendorLeadsResult> {
  const { prisma } = await import("@dg/database");
  const result: SyncVendorLeadsResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const wpLead of input.leads) {
    try {
      const wpId = wpLead.id;
      const existing = await prisma.lead.findFirst({
        where: {
          organisationId: input.organisationId,
          externalRefs: {
            path: ["wp_vendor_lead_id"],
            equals: wpId,
          },
        },
      });

      const contactId = await resolveContactId(
        input.organisationId,
        input.actorId,
        wpLead,
      );
      await applyVendorRole(input.organisationId, contactId);
      const { leadMetadata, title } = await resolveLeadMetadata(wpLead);

      if (existing) {
        const prevMeta =
          (existing.metadata as Record<string, unknown> | null) ?? {};
        const stageChanged = prevMeta.stage !== leadMetadata.stage;
        const addressChanged =
          prevMeta.property_address !== leadMetadata.property_address;
        const titleChanged = existing.title !== title;

        if (!stageChanged && !addressChanged && !titleChanged && !contactId) {
          result.skipped += 1;
          continue;
        }

        await prisma.lead.update({
          where: { id: existing.id },
          data: {
            title: titleChanged ? title : existing.title,
            description: leadMetadata.property_address
              ? String(leadMetadata.property_address)
              : existing.description,
            contactId: contactId ?? existing.contactId,
            status: wpLead.status ?? existing.status,
            metadata: {
              ...prevMeta,
              ...leadMetadata,
            } as Prisma.InputJsonValue,
            externalRefs: {
              ...((existing.externalRefs as Record<string, unknown> | null) ?? {}),
              wp_vendor_lead_id: wpId,
              wp_created_at: wpLead.created_at,
              wp_synced_at: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        });

        result.updated += 1;
        continue;
      }

      await createLead({
        organisationId: input.organisationId,
        actorId: input.actorId,
        source: wpLead.source ?? "wordpress",
        title,
        description: leadMetadata.property_address
          ? String(leadMetadata.property_address)
          : undefined,
        contactId,
        status: wpLead.status ?? "new",
        metadata: leadMetadata,
        externalRefs: {
          wp_vendor_lead_id: wpId,
          wp_created_at: wpLead.created_at,
        },
      });

      result.created += 1;
    } catch (err) {
      result.errors.push(
        `Lead ${wpLead.id}: ${err instanceof Error ? err.message : "sync failed"}`,
      );
    }
  }

  return result;
}

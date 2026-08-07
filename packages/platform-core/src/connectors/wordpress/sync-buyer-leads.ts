import type { Prisma } from "@dg/database";

import { createContact } from "../../contacts";
import { createLead } from "../../leads";

export interface WpBuyerLead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  property_address?: string;
  property_url?: string;
  requirements?: string;
  stage?: string;
  status?: string;
  created_at?: string;
}

export interface SyncBuyerLeadsInput {
  organisationId: string;
  actorId?: string;
  leads: WpBuyerLead[];
}

export interface SyncBuyerLeadsResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

async function resolveContactId(
  organisationId: string,
  actorId: string | undefined,
  wpLead: WpBuyerLead,
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
    source: "buyer_enquiry",
  });
  return created.id;
}

async function applyBuyerRole(organisationId: string, contactId: string | undefined) {
  if (!contactId) return;
  const { ensureReContactRole } = await import("../../real-estate/contact-roles");
  await ensureReContactRole({ organisationId, contactId, role: "buyer" });
}

/** Idempotent sync — buyer enquiries from WordPress RE module. */
export async function syncBuyerLeadsFromWordPress(
  input: SyncBuyerLeadsInput,
): Promise<SyncBuyerLeadsResult> {
  const { prisma } = await import("@dg/database");
  const result: SyncBuyerLeadsResult = {
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
            path: ["wp_buyer_lead_id"],
            equals: wpId,
          },
        },
      });

      const contactId = await resolveContactId(
        input.organisationId,
        input.actorId,
        wpLead,
      );
      await applyBuyerRole(input.organisationId, contactId);

      const rawAddress = wpLead.property_address?.trim() ?? "";
      const title =
        rawAddress ||
        wpLead.requirements?.trim().slice(0, 80) ||
        wpLead.name?.trim() ||
        `Buyer lead #${wpLead.id}`;

      const leadMetadata: Record<string, unknown> = {
        lead_type: "buyer",
        stage: wpLead.stage ?? "inquiry",
        property_address: rawAddress || undefined,
        property_url: wpLead.property_url || undefined,
        wp_name: wpLead.name,
      };

      if (existing) {
        const prevMeta =
          (existing.metadata as Record<string, unknown> | null) ?? {};
        const changed =
          prevMeta.stage !== leadMetadata.stage ||
          existing.title !== title ||
          existing.description !== (wpLead.requirements ?? existing.description);

        if (!changed && !contactId) {
          result.skipped += 1;
          continue;
        }

        await prisma.lead.update({
          where: { id: existing.id },
          data: {
            title,
            description: wpLead.requirements ?? existing.description,
            contactId: contactId ?? existing.contactId,
            status: wpLead.status ?? existing.status,
            metadata: { ...prevMeta, ...leadMetadata } as Prisma.InputJsonValue,
            externalRefs: {
              ...((existing.externalRefs as Record<string, unknown> | null) ?? {}),
              wp_buyer_lead_id: wpId,
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
        source: "buyer_enquiry",
        title,
        description: wpLead.requirements ?? undefined,
        contactId,
        status: wpLead.status ?? "new",
        metadata: leadMetadata,
        externalRefs: {
          wp_buyer_lead_id: wpId,
          wp_created_at: wpLead.created_at,
        },
      });
      result.created += 1;
    } catch (err) {
      result.errors.push(
        `Buyer ${wpLead.id}: ${err instanceof Error ? err.message : "sync failed"}`,
      );
    }
  }

  return result;
}

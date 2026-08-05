import { createContact, createLead } from "@dg/platform-core";

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
  skipped: number;
  errors: string[];
}

/** Idempotent sync — skips leads already imported via externalRefs.wp_vendor_lead_id */
export async function syncVendorLeadsFromWordPress(
  input: SyncVendorLeadsInput,
): Promise<SyncVendorLeadsResult> {
  const { prisma } = await import("@dg/database");
  const result: SyncVendorLeadsResult = { created: 0, skipped: 0, errors: [] };

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

      if (existing) {
        result.skipped += 1;
        continue;
      }

      let contactId: string | undefined;
      const email = wpLead.email?.trim().toLowerCase();
      if (email) {
        const existingContact = await prisma.contact.findFirst({
          where: { organisationId: input.organisationId, email, deletedAt: null },
        });
        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const parts = wpLead.name.trim().split(/\s+/);
          const created = await createContact({
            organisationId: input.organisationId,
            actorId: input.actorId,
            firstName: parts[0] ?? "Unknown",
            lastName: parts.slice(1).join(" ") || undefined,
            email,
            phone: wpLead.phone,
            source: wpLead.source ?? "wordpress",
          });
          contactId = created.id;
        }
      }

      const title =
        wpLead.property_address?.trim() ||
        wpLead.name?.trim() ||
        `Vendor lead #${wpId}`;

      await createLead({
        organisationId: input.organisationId,
        actorId: input.actorId,
        source: wpLead.source ?? "wordpress",
        title,
        description: wpLead.property_address,
        contactId,
        status: wpLead.status ?? "new",
        metadata: {
          stage: wpLead.stage ?? "vendor_lead",
          property_address: wpLead.property_address,
          wp_name: wpLead.name,
        },
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

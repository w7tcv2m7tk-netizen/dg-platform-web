import type { Prisma } from "@dg/database";

import type { CrmTransactionContext } from "../crm-transaction";
import { platformEvents, type PlatformEvent } from "../events";
import { AcquisitionError, legacyAustralianAbns } from "./identity";
import { writeAuditLog } from "../audit";
import { createCompany } from "../companies";
import { ensureContactForLeadFields, getContact } from "../contacts";
import { createOpportunity, getOpportunity } from "../opportunities";

export type ProspectCrmConversionResult = {
  prospectId: string;
  companyId: string;
  contactId: string | null;
  opportunityId: string;
};

function stringMeta(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Promote a Growth prospect into this organisation's canonical CRM.
 *
 * This is deliberately separate from the operator-only Growth client transition,
 * which creates a new DigitalGate tenant. Customer Prospecting conversion stays
 * inside the current organisation and creates/links Company, Contact and Opportunity.
 *
 * The prospect metadata stores canonical CRM ids so retries are idempotent and a
 * partially completed conversion can safely resume without creating parallel CRM records.
 */
async function convertGrowthProspectToCrmLocked(input: {
  organisationId: string;
  prospectId: string;
  actorId?: string;
}, context: CrmTransactionContext): Promise<ProspectCrmConversionResult | null> {
  const prisma = context.db;
  await prisma.$queryRaw`SELECT id FROM growth_prospects WHERE id = ${input.prospectId} AND organisation_id = ${input.organisationId} FOR UPDATE`;

  const prospect = await prisma.growthProspect.findFirst({
    where: {
      id: input.prospectId,
      organisationId: input.organisationId,
      archivedAt: null,
    },
  });
  if (!prospect) return null;

  let metadata = (prospect.metadata as Record<string, unknown> | null) ?? {};

  let companyId = stringMeta(metadata, "crm_company_id");
  if (companyId) {
    const existing = await prisma.company.findFirst({
      where: { id: companyId, organisationId: input.organisationId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new AcquisitionError("relationship_conflict", "Existing CRM company link is unavailable; reconcile it explicitly");
  }

  const existingContactId = stringMeta(metadata, "crm_contact_id");
  const existingContact = existingContactId
    ? await getContact(input.organisationId, existingContactId, prisma)
    : prospect.contactEmail ? await prisma.contact.findFirst({ where: { organisationId: input.organisationId, deletedAt: null, email: prospect.contactEmail.toLowerCase() } }) : null;
  if (existingContactId && !existingContact) throw new AcquisitionError("relationship_conflict", "Existing CRM contact link is unavailable; reconcile it explicitly");
  if (!companyId && prospect.abn) {
    const match = await prisma.company.findFirst({ where: { organisationId: input.organisationId, deletedAt: null, abn: prospect.abn }, select: { id: true } });
    companyId = match?.id ?? null;
  }
  if (!companyId && prospect.abn) {
    const legacy = await prisma.company.findMany({ where: { organisationId: input.organisationId, abn: null, deletedAt: null }, select: { id: true, metadata: true } });
    const candidates = legacy.filter((row) => legacyAustralianAbns(row.metadata).includes(prospect.abn!));
    if (candidates.length > 1 || candidates.some((row) => legacyAustralianAbns(row.metadata).length > 1))
      throw new AcquisitionError("reconciliation_required", "Legacy CRM identities need explicit reconciliation");
    if (candidates.length === 1) companyId = candidates[0].id;
  }
  if (companyId) {
    await prisma.$queryRaw`SELECT id FROM companies WHERE id = ${companyId} AND organisation_id = ${input.organisationId} AND deleted_at IS NULL FOR UPDATE`;
    const company = await prisma.company.findFirst({ where: { id: companyId, organisationId: input.organisationId, deletedAt: null } });
    if (!company || (prospect.abn && company.abn && prospect.abn !== company.abn))
      throw new AcquisitionError("identity_conflict", "CRM company does not match this business identity");
  }
  if (existingContact?.companyId && existingContact.companyId !== companyId)
    throw new AcquisitionError("contact_company_conflict", "Select the existing company explicitly before conversion; contact association was preserved");

  if (companyId && prospect.abn) await prisma.company.updateMany({ where: { id: companyId, organisationId: input.organisationId, abn: null }, data: { abn: prospect.abn, identityProvenance: prospect.identityProvenance as Prisma.InputJsonValue } });
  const completedOpportunityId = stringMeta(metadata, "crm_opportunity_id");
  if (companyId && completedOpportunityId && await getOpportunity(input.organisationId, completedOpportunityId, prisma))
    return { prospectId: prospect.id, companyId, contactId: existingContact?.id ?? null, opportunityId: completedOpportunityId };

  if (!companyId) {
    const existingCompany = prospect.abn ? await prisma.company.findFirst({
      where: { organisationId: input.organisationId, deletedAt: null, abn: prospect.abn }, select: { id: true },
    }) : null;

    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const company = await createCompany({
        organisationId: input.organisationId,
        actorId: input.actorId,
        name: prospect.businessName,
        abn: prospect.abn ?? undefined,
        identityProvenance: prospect.identityProvenance as Prisma.InputJsonValue | undefined,
        website: prospect.websiteUrl ?? undefined,
        phone: prospect.contactPhone ?? undefined,
        email: prospect.contactEmail ?? undefined,
        industry: prospect.industry ?? undefined,
      }, context);
      companyId = company.id;

    }

    metadata = { ...metadata, crm_company_id: companyId };
    await prisma.growthProspect.update({
      where: { id: prospect.id },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });
  }

  metadata = { ...metadata, crm_company_id: companyId };
  await prisma.growthProspect.update({ where: { id: prospect.id }, data: { metadata: metadata as Prisma.InputJsonValue } });
  let contactId = stringMeta(metadata, "crm_contact_id");
  if (contactId) {
    const existing = await getContact(input.organisationId, contactId, prisma);
    if (!existing) throw new AcquisitionError("relationship_conflict", "Existing CRM contact link is unavailable; reconcile it explicitly");
  }

  if (!contactId) {
    const ensured = existingContact ? { id: existingContact.id, created: false } : await ensureContactForLeadFields({
      organisationId: input.organisationId,
      actorId: input.actorId,
      name: prospect.contactName ?? undefined,
      email: prospect.contactEmail ?? undefined,
      phone: prospect.contactPhone ?? undefined,
      source: "prospecting",
    }, context);
    contactId = ensured?.id ?? null;

    if (contactId) {
      const contact = await getContact(input.organisationId, contactId, prisma);
      if (contact?.companyId && contact.companyId !== companyId) {
        throw new AcquisitionError("contact_company_conflict", "Contact belongs to another company; its association was preserved");
      }
      metadata = { ...metadata, crm_contact_id: contactId };
      await prisma.growthProspect.update({
        where: { id: prospect.id },
        data: { metadata: metadata as Prisma.InputJsonValue },
      });
    }
  }

  let opportunityId = stringMeta(metadata, "crm_opportunity_id");
  if (opportunityId) {
    const existing = await getOpportunity(input.organisationId, opportunityId, prisma);
    if (!existing) throw new AcquisitionError("relationship_conflict", "Existing CRM opportunity link is unavailable; reconcile it explicitly");
  }

  if (!opportunityId) {
    const existingOpportunity = await prisma.opportunity.findFirst({
      where: {
        organisationId: input.organisationId,
        pipelineId: "prospecting",
        metadata: {
          path: ["growth_prospect_id"],
          equals: prospect.id,
        },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (existingOpportunity) {
      opportunityId = existingOpportunity.id;
    } else {
      const opportunity = await createOpportunity({
        organisationId: input.organisationId,
        actorId: input.actorId,
        title: `${prospect.businessName} opportunity`,
        stage: "qualified",
        companyId,
        contactId: contactId ?? undefined,
        pipelineId: "prospecting",
        metadata: {
          growth_prospect_id: prospect.id,
          converted_from_prospecting: true,
        },
      }, context);
      opportunityId = opportunity.id;
    }

    metadata = {
      ...metadata,
      crm_company_id: companyId,
      ...(contactId ? { crm_contact_id: contactId } : {}),
      crm_opportunity_id: opportunityId,
      crm_converted_at: new Date().toISOString(),
    };
    await prisma.growthProspect.update({
      where: { id: prospect.id },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });
  }

  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: prospect.id,
      type: "converted_to_crm",
      metadata: { companyId, contactId, opportunityId },
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "GrowthProspect",
    entityId: prospect.id,
    changes: {
      crmConversion: { companyId, contactId, opportunityId },
    } as Prisma.InputJsonValue,
  }, prisma);

  return {
    prospectId: prospect.id,
    companyId,
    contactId,
    opportunityId,
  };
}

/** All protected work shares one connection; external event handlers run after commit. */
export async function convertGrowthProspectToCrm(input: { organisationId: string; prospectId: string; actorId?: string }) {
  const { prisma } = await import("@dg/database");
  const events: PlatformEvent[] = [];
  const result = await prisma.$transaction(async (tx) => {
    // Lock the tenant's conversion stream: two prospects may identify the same ABN.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"acquisition-crm:" + input.organisationId}, 0))::text`;
    return convertGrowthProspectToCrmLocked(input, { db: tx, events });
  }, { timeout: 30000, maxWait: 30000 });
  for (const event of events) await platformEvents.publish(event);
  return result;
}

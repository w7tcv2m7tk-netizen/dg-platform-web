import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { createCompany } from "../companies";
import { ensureContactForLeadFields, getContact, updateContact } from "../contacts";
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
export async function convertGrowthProspectToCrm(input: {
  organisationId: string;
  prospectId: string;
  actorId?: string;
}): Promise<ProspectCrmConversionResult | null> {
  const { prisma } = await import("@dg/database");

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
    if (!existing) companyId = null;
  }

  if (!companyId) {
    const existingCompany = await prisma.company.findFirst({
      where: {
        organisationId: input.organisationId,
        deletedAt: null,
        OR: [
          ...(prospect.websiteUrl ? [{ website: prospect.websiteUrl }] : []),
          { name: { equals: prospect.businessName, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const company = await createCompany({
        organisationId: input.organisationId,
        actorId: input.actorId,
        name: prospect.businessName,
        website: prospect.websiteUrl ?? undefined,
        phone: prospect.contactPhone ?? undefined,
        email: prospect.contactEmail ?? undefined,
        industry: prospect.industry ?? undefined,
      });
      companyId = company.id;
    }

    metadata = { ...metadata, crm_company_id: companyId };
    await prisma.growthProspect.update({
      where: { id: prospect.id },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });
  }

  let contactId = stringMeta(metadata, "crm_contact_id");
  if (contactId) {
    const existing = await getContact(input.organisationId, contactId);
    if (!existing) contactId = null;
  }

  if (!contactId) {
    const ensured = await ensureContactForLeadFields({
      organisationId: input.organisationId,
      actorId: input.actorId,
      name: prospect.contactName ?? undefined,
      email: prospect.contactEmail ?? undefined,
      phone: prospect.contactPhone ?? undefined,
      source: "prospecting",
    });
    contactId = ensured?.id ?? null;

    if (contactId) {
      const contact = await getContact(input.organisationId, contactId);
      if (contact && contact.companyId !== companyId) {
        await updateContact({
          organisationId: input.organisationId,
          contactId,
          actorId: input.actorId,
          companyId,
        });
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
    const existing = await getOpportunity(input.organisationId, opportunityId);
    if (!existing) opportunityId = null;
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
      });
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
  });

  return {
    prospectId: prospect.id,
    companyId,
    contactId,
    opportunityId,
  };
}

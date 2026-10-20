import type { Prisma } from "@dg/database";
import { AcquisitionError } from "./identity";

/** Link identities only. Never onboard, mutate commercial state or grant membership. */
export async function linkAcquisitionRelationship(input: {
  organisationId: string; prospectId: string; actorId: string;
  companyId?: string; contactId?: string; customerOrganisationId?: string;
}) {
  const { prisma } = await import("@dg/database");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM growth_prospects WHERE id = ${input.prospectId} AND organisation_id = ${input.organisationId} FOR UPDATE`;
    const prospect = await tx.growthProspect.findFirst({ where: { id: input.prospectId, organisationId: input.organisationId, archivedAt: null } });
    if (!prospect) throw new AcquisitionError("not_found", "Prospect not found", 404);
    const metadata = (prospect.metadata as Record<string, unknown> | null) ?? {};
    const companyId = input.companyId ?? (typeof metadata.crm_company_id === "string" ? metadata.crm_company_id : undefined);
    const contactId = input.contactId ?? (typeof metadata.crm_contact_id === "string" ? metadata.crm_contact_id : undefined);
    for (const [key, requested] of [["crm_company_id", companyId], ["crm_contact_id", contactId]] as const) {
      if (metadata[key] && requested && metadata[key] !== requested)
        throw new AcquisitionError("relationship_conflict", "An existing CRM link cannot be replaced by intake");
    }
    if (companyId) {
      const company = await tx.company.findFirst({ where: { id: companyId, organisationId: input.organisationId, deletedAt: null } });
      if (!company) throw new AcquisitionError("not_found", "CRM company not found", 404);
      if (prospect.abn && company.abn && prospect.abn !== company.abn)
        throw new AcquisitionError("identity_conflict", "The verified business identities differ");
      if (prospect.abn && !company.abn) await tx.company.update({ where: { id: companyId }, data: { abn: prospect.abn, identityProvenance: prospect.identityProvenance as Prisma.InputJsonValue } });
    }
    if (contactId) {
      const contact = await tx.contact.findFirst({ where: { id: contactId, organisationId: input.organisationId, deletedAt: null } });
      if (!contact) throw new AcquisitionError("not_found", "CRM contact not found", 404);
      if (companyId && contact.companyId && contact.companyId !== companyId)
        throw new AcquisitionError("contact_company_conflict", "Contact belongs to another company; its association was preserved");
      // Even unassigned contacts are not reassigned by relationship intake.
    }
    const target = input.customerOrganisationId;
    if (target) {
      if (prospect.convertedOrganisationId && prospect.convertedOrganisationId !== target)
        throw new AcquisitionError("relationship_conflict", "Customer organisation link already exists");
      // Explicit target plus active admin/owner authority in both tenants. ABN is never an access credential.
      const grants = await tx.membership.findMany({ where: { organisationId: { in: [input.organisationId, target] }, clerkUserId: input.actorId, status: "active", role: { in: ["owner", "admin"] } }, select: { organisationId: true } });
      const authorised = new Set(grants.map((g) => g.organisationId));
      if (!authorised.has(input.organisationId) || !authorised.has(target))
        throw new AcquisitionError("forbidden", "Active owner or admin authority in both organisations is required", 403);
    }
    const unchanged = (!companyId || metadata.crm_company_id === companyId) && (!contactId || metadata.crm_contact_id === contactId) && (!target || prospect.convertedOrganisationId === target);
    if (unchanged) return { prospectId: prospect.id, companyId, contactId, customerOrganisationId: prospect.convertedOrganisationId };
    await tx.growthProspect.update({ where: { id: prospect.id }, data: {
      ...(target ? { convertedOrganisationId: target } : {}),
      metadata: { ...metadata, ...(companyId ? { crm_company_id: companyId } : {}), ...(contactId ? { crm_contact_id: contactId } : {}) } as Prisma.InputJsonValue,
    } });
    await tx.growthProspectEngagement.create({ data: { prospectId: prospect.id, type: "relationship_linked", metadata: { actorId: input.actorId, companyId: companyId ?? null, contactId: contactId ?? null, customerOrganisationId: target ?? null } } });
    return { prospectId: prospect.id, companyId, contactId, customerOrganisationId: target ?? prospect.convertedOrganisationId };
  });
}

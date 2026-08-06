import type { Prisma } from "@dg/database";

import { updateLeadStage, type VendorStage } from "../leads";
import { updatePropertyStatus } from "../properties";

export async function linkBookingToVendorLead(
  organisationId: string,
  bookingLeadId: string,
) {
  const { prisma } = await import("@dg/database");

  const booking = await prisma.lead.findFirst({
    where: { id: bookingLeadId, organisationId, source: "re_booking" },
  });
  if (!booking) return null;

  const metadata = (booking.metadata as Record<string, unknown> | null) ?? {};
  const email = (metadata.email as string | undefined)?.trim().toLowerCase();
  if (!email) return null;

  const contact = await prisma.contact.findFirst({
    where: { organisationId, email, deletedAt: null },
  });

  let vendorLead = contact
    ? await prisma.lead.findFirst({
        where: {
          organisationId,
          contactId: contact.id,
          NOT: { source: "buyer_enquiry" },
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  if (!vendorLead) {
    vendorLead = await prisma.lead.findFirst({
      where: {
        organisationId,
        NOT: { source: { in: ["buyer_enquiry", "re_booking"] } },
        metadata: { path: ["email"], equals: email },
      },
    });
  }

  if (!vendorLead) return null;

  const updated = await prisma.lead.update({
    where: { id: bookingLeadId },
    data: {
      metadata: {
        ...metadata,
        linked_vendor_lead_id: vendorLead.id,
        linked_at: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Lead",
      entityId: vendorLead.id,
      activityType: "booking_linked",
      title: "Appraisal booking linked",
      body: booking.title,
      sourceApp: "real-estate",
      metadata: { bookingLeadId } as Prisma.InputJsonValue,
    },
  });

  return { booking: updated, vendorLeadId: vendorLead.id };
}

export async function completePastClientWorkflow(
  organisationId: string,
  vendorLeadId: string,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");

  const lead = await prisma.lead.findFirst({
    where: { id: vendorLeadId, organisationId },
  });
  if (!lead) return null;

  await updateLeadStage(
    organisationId,
    vendorLeadId,
    "past_client" as VendorStage,
    actorId,
    { skipPropertySync: true },
  );

  const property = await prisma.property.findFirst({
    where: { organisationId, leadId: vendorLeadId, deletedAt: null },
  });

  if (property && property.status !== "sold") {
    await updatePropertyStatus(organisationId, property.id, "sold", actorId, {
      skipLeadSync: true,
    });
  }

  const metadata = (lead.metadata as Record<string, unknown> | null) ?? {};

  await prisma.lead.update({
    where: { id: vendorLeadId },
    data: {
      metadata: {
        ...metadata,
        past_client_at: new Date().toISOString(),
        review_requested: true,
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Lead",
      entityId: vendorLeadId,
      activityType: "past_client",
      title: "Moved to past client",
      body: "Settlement complete — review request recommended",
      sourceApp: "real-estate",
      createdBy: actorId,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Lead",
      entityId: vendorLeadId,
      activityType: "review_request",
      title: "Review request queued",
      body: "Send Google review request via Reviews app",
      sourceApp: "real-estate",
      createdBy: actorId,
      metadata: { href: "/apps/reviews/requests" } as Prisma.InputJsonValue,
    },
  });

  return { vendorLeadId, propertyId: property?.id ?? null };
}

export async function generateRePipelineReport(organisationId: string) {
  const { getReDashboardStats } = await import("./dashboard");
  const stats = await getReDashboardStats(organisationId);

  const vendorLines = Object.entries(stats.vendorByStage)
    .map(([stage, count]) => `- ${stage.replace(/_/g, " ")}: ${count}`)
    .join("\n");

  const buyerLines = Object.entries(stats.buyerByStage)
    .map(([stage, count]) => `- ${stage.replace(/_/g, " ")}: ${count}`)
    .join("\n");

  return `# Vendor pipeline report

**Vendor leads:** ${stats.vendorLeads}
**Buyer leads:** ${stats.buyerLeads}
**Properties:** ${stats.properties} (${stats.listed} listed, ${stats.underOffer} under offer, ${stats.sold} sold)

## Vendor stages
${vendorLines || "- No vendor leads"}

## Buyer stages
${buyerLines || "- No buyer leads"}

## Recommendations
${stats.appraisals > 0 ? `- ${stats.appraisals} properties in appraisal — prioritise listing presentations` : "- Start vendor lead pipeline from WordPress sync"}
${stats.listed === 0 && stats.appraisals > 0 ? "- Move appraisal properties to listed status" : ""}
${stats.buyerLeads > 0 ? `- Nurture ${stats.buyerLeads} buyer enquiries through viewing stage` : "- Enable buyer lead sync from property enquiry forms"}
`.trim();
}

export async function generateAppraisalSummary(
  organisationId: string,
  propertyId: string,
) {
  const { prisma } = await import("@dg/database");
  const { formatPropertyAddress } = await import("../properties");

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;

  const lead = property.leadId
    ? await prisma.lead.findFirst({ where: { id: property.leadId, organisationId } })
    : null;

  const address = formatPropertyAddress(property);
  const price =
    property.listingPriceCents != null
      ? `$${(property.listingPriceCents / 100).toLocaleString("en-AU")}`
      : "TBC";

  return `# Appraisal summary — ${address}

**Status:** ${property.status.replace(/_/g, " ")}
**Guide price:** ${price}
**Vendor:** ${lead?.title ?? "Linked vendor lead"}

## Property
${property.bedrooms != null ? `- ${property.bedrooms} bedrooms` : ""}
${property.bathrooms != null ? `- ${property.bathrooms} bathrooms` : ""}
- ${property.suburb} ${property.state} ${property.postcode}

## Recommended narrative
This property at ${address} is positioned for the ${property.suburb} market. Based on current pipeline status (${property.status}), focus on ${property.status === "appraisal" ? "comparable sales analysis and vendor presentation" : "buyer enquiry follow-up and campaign optimisation"}.

${lead?.description ? `\n**Vendor notes:** ${lead.description}` : ""}
`.trim();
}

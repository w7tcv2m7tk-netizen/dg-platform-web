import type { Prisma } from "@dg/database";

import { updateLeadStage, type VendorStage } from "../leads";
import {
  formatPropertyAddress,
  getPropertyCotalityDetails,
  getPropertyCotalityId,
  pullCotalityPropertyDetails,
  updatePropertyStatus,
} from "../properties";
import type { CoreLogicPropertyDetailsSnapshot } from "../connectors/corelogic";

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

function aud(amount: number | undefined | null): string | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  return `$${amount.toLocaleString("en-AU")}`;
}

function sectionNote(
  status: string | undefined,
  emptyCopy: string,
): string {
  if (status === "ok") return "";
  if (status === "unavailable") {
    return `_Not available from Cotality for this property (${emptyCopy})._`;
  }
  if (status === "error") {
    return `_Cotality returned an error for this section (${emptyCopy})._`;
  }
  if (status === "empty") {
    return `_No data returned by Cotality (${emptyCopy})._`;
  }
  return `_Section not loaded yet — pull Cotality details first._`;
}

function renderCotalitySections(
  snapshot: CoreLogicPropertyDetailsSnapshot | null,
): string {
  if (!snapshot) {
    return `## Cotality data
_No Cotality Property Details on file. Match the address, then pull details._`;
  }

  const core = snapshot.core;
  const additional = snapshot.additional;
  const site = snapshot.site;
  const lastSale = snapshot.lastSale;
  const lines: string[] = [];

  lines.push(`## Property attributes (Cotality)`);
  lines.push(`_Fetched ${new Date(snapshot.fetchedAt).toLocaleString("en-AU")} · Cotality id ${String(snapshot.propertyId)}_`);
  lines.push("");
  if (snapshot.sections.core === "ok" && core) {
    if (core.propertyType) lines.push(`- **Type:** ${core.propertySubType || core.propertyType}`);
    if (core.beds != null) lines.push(`- **Bedrooms:** ${core.beds}`);
    if (core.baths != null) lines.push(`- **Bathrooms:** ${core.baths}`);
    if (core.carSpaces != null) lines.push(`- **Car spaces:** ${core.carSpaces}`);
    if (core.landArea != null) {
      lines.push(
        `- **Land area:** ${core.landArea} m²${core.landAreaSource ? ` (${core.landAreaSource})` : ""}`,
      );
    }
  } else {
    lines.push(sectionNote(snapshot.sections.core, "attributes/core"));
  }

  lines.push("");
  lines.push(`## Additional attributes`);
  if (snapshot.sections.additional === "ok" && additional) {
    if (additional.floorArea != null) lines.push(`- **Floor area:** ${additional.floorArea} m²`);
    if (additional.yearBuilt != null) lines.push(`- **Year built:** ${additional.yearBuilt}`);
  } else {
    lines.push(sectionNote(snapshot.sections.additional, "attributes/additional"));
  }

  lines.push("");
  lines.push(`## Site / zoning`);
  if (snapshot.sections.site === "ok" && site) {
    if (site.landUsePrimary) lines.push(`- **Land use:** ${site.landUsePrimary}`);
    if (site.zoneDescriptionLocal || site.zoneCodeLocal) {
      lines.push(
        `- **Zone:** ${site.zoneDescriptionLocal || site.zoneCodeLocal}${site.zoneCodeLocal && site.zoneDescriptionLocal ? ` (${site.zoneCodeLocal})` : ""}`,
      );
    }
  } else {
    lines.push(sectionNote(snapshot.sections.site, "site"));
  }

  lines.push("");
  lines.push(`## Sales history (Cotality)`);
  const salesRows =
    snapshot.salesHistory?.length
      ? snapshot.salesHistory
      : lastSale
        ? [lastSale]
        : [];
  if (salesRows.length) {
    for (const sale of salesRows) {
      const bits: string[] = [];
      if (sale.price != null && !sale.isPriceWithheld) bits.push(aud(sale.price) ?? "");
      else if (sale.isPriceWithheld) bits.push("price withheld");
      if (sale.contractDate) bits.push(`contract ${sale.contractDate}`);
      if (sale.settlementDate) bits.push(`settlement ${sale.settlementDate}`);
      if (sale.type) bits.push(sale.type);
      lines.push(`- ${bits.filter(Boolean).join(" · ") || "Sale record (no price/date returned)"}`);
    }
    if (
      snapshot.sections.salesHistory === "unavailable" ||
      snapshot.sections.salesHistory === "error"
    ) {
      lines.push(
        `_Full \`/sales\` history unavailable — showing last sale only when Cotality returned it._`,
      );
    }
  } else if (snapshot.sections.lastSale === "ok" || snapshot.sections.salesHistory === "ok") {
    lines.push(sectionNote("empty", "sales"));
  } else {
    lines.push(
      sectionNote(
        snapshot.sections.salesHistory ?? snapshot.sections.lastSale,
        "sales",
      ),
    );
  }

  lines.push("");
  lines.push(`## Features`);
  if (snapshot.sections.features === "ok") {
    if (snapshot.features?.length) {
      for (const f of snapshot.features) lines.push(`- ${f}`);
    }
    if (snapshot.featureAttributes?.length) {
      for (const fa of snapshot.featureAttributes) {
        lines.push(`- **${fa.name}:** ${fa.value}`);
      }
    }
    if (!snapshot.features?.length && !snapshot.featureAttributes?.length) {
      lines.push(sectionNote("empty", "features"));
    }
  } else {
    lines.push(sectionNote(snapshot.sections.features, "features"));
  }

  lines.push("");
  lines.push(`## Automated valuation (IntelliVal)`);
  const avm = snapshot.avm;
  if (avm.available) {
    if (avm.estimate != null) lines.push(`- **Estimate:** ${aud(avm.estimate)}`);
    if (avm.lowEstimate != null || avm.highEstimate != null) {
      lines.push(
        `- **Range:** ${aud(avm.lowEstimate) ?? "—"} – ${aud(avm.highEstimate) ?? "—"}`,
      );
    }
    if (avm.confidence != null) lines.push(`- **Confidence:** ${avm.confidence}`);
    if (avm.valuationDate) lines.push(`- **As at:** ${avm.valuationDate}`);
    lines.push(`_Source: Cotality IntelliVal. Not a formal appraisal._`);
  } else {
    lines.push(
      `_${avm.message || "No AVM estimate from Cotality for this property."}_`,
    );
    lines.push(
      `_We do not invent valuations. When IntelliVal returns an estimate it will appear here._`,
    );
  }

  return lines.join("\n");
}

export type PropertyReportPayload = {
  markdown: string;
  plainText: string;
  organisationName: string;
  address: string;
  cotalityPropertyId: string | number | null;
  detailsFetchedAt: string | null;
  sections: CoreLogicPropertyDetailsSnapshot["sections"] | null;
  partial: boolean;
};

/**
 * Vendor-facing property report for request follow-up.
 * Uses Cotality fields when pulled; honest empty/partial sections otherwise.
 * Does not invent buyer demand scores or fake comparable citations.
 */
export async function generatePropertyReport(
  organisationId: string,
  propertyId: string,
  options?: { refreshCotality?: boolean; actorId?: string },
): Promise<PropertyReportPayload | null> {
  const { prisma } = await import("@dg/database");

  let property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;

  if (options?.refreshCotality && getPropertyCotalityId({
    metadata: (property.metadata as Record<string, unknown> | null) ?? null,
    externalRefs: (property.externalRefs as Record<string, unknown> | null) ?? null,
  })) {
    const pulled = await pullCotalityPropertyDetails(
      organisationId,
      propertyId,
      options.actorId,
    );
    if (pulled.ok) {
      property = await prisma.property.findFirst({
        where: { id: propertyId, organisationId, deletedAt: null },
      });
      if (!property) return null;
    }
  }

  const org = await prisma.organisation.findFirst({
    where: { id: organisationId },
    select: { name: true },
  });
  const organisationName = org?.name?.trim() || "Your agency";

  const meta = (property.metadata as Record<string, unknown> | null) ?? {};
  const snapshot = getPropertyCotalityDetails({ metadata: meta });
  const cotalityPropertyId = getPropertyCotalityId({
    metadata: meta,
    externalRefs: property.externalRefs as Record<string, unknown> | null,
  });
  const address = formatPropertyAddress(property);

  const partial =
    !snapshot ||
    Object.values(snapshot.sections).some((s) => s !== "ok") ||
    (snapshot.avm && !snapshot.avm.available);

  const contactBits = [
    property.bedrooms != null ? `${property.bedrooms} bed` : null,
    property.bathrooms != null ? `${property.bathrooms} bath` : null,
    typeof meta.car_spaces === "number" ? `${meta.car_spaces} car` : null,
  ].filter(Boolean);

  const markdown = `# Property report

**${organisationName}**
**${address}**

${contactBits.length ? contactBits.join(" · ") : "_Dwelling attributes shown when Cotality or listing data is available._"}

${renderCotalitySections(snapshot)}

## About this report
This report summarises **Cotality (CoreLogic) property data** held in DigitalGate for ${address}.
Public property-report requests on WordPress still create a CRM lead; agents generate and send this report from the platform.
Sections marked unavailable are honest gaps (sandbox/UAT limits or property out of scope) — values are never fabricated.

_Prepared ${new Date().toLocaleString("en-AU")} · Data source: Cotality where indicated._
`.trim();

  return {
    markdown,
    plainText: markdown.replace(/^#+\s*/gm, "").replace(/\*\*/g, ""),
    organisationName,
    address,
    cotalityPropertyId,
    detailsFetchedAt: snapshot?.fetchedAt ?? null,
    sections: snapshot?.sections ?? null,
    partial: Boolean(partial),
  };
}

export async function sendPropertyReportEmail(input: {
  organisationId: string;
  propertyId: string;
  to: string;
  actorId?: string;
  refreshCotality?: boolean;
}): Promise<
  | {
      ok: true;
      report: PropertyReportPayload;
      delivery: { id: string; status: string; provider?: string };
    }
  | { ok: false; reason: string; message: string }
> {
  const to = input.to.trim();
  if (!to || !to.includes("@")) {
    return { ok: false, reason: "validation_error", message: "Valid email required" };
  }

  const report = await generatePropertyReport(
    input.organisationId,
    input.propertyId,
    {
      refreshCotality: input.refreshCotality,
      actorId: input.actorId,
    },
  );
  if (!report) {
    return { ok: false, reason: "property_not_found", message: "Property not found" };
  }

  const { sendMessage } = await import("../communications");
  const delivery = await sendMessage({
    organisationId: input.organisationId,
    channel: "email",
    to,
    subject: `Property report — ${report.address}`,
    body: report.plainText,
    metadata: {
      purpose: "property_report",
      propertyId: input.propertyId,
      footerNote:
        "Property data from Cotality where shown. This is not a formal valuation.",
    },
  });

  const { prisma } = await import("@dg/database");
  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Property",
      entityId: input.propertyId,
      activityType: "property_report_sent",
      title: `Property report → ${to}`,
      body: report.address,
      sourceApp: "real-estate",
      createdBy: input.actorId,
      metadata: {
        to,
        deliveryId: delivery.id,
        deliveryStatus: delivery.status,
        partial: report.partial,
        cotalityPropertyId: report.cotalityPropertyId,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    ok: true,
    report,
    delivery: {
      id: delivery.id,
      status: delivery.status,
      provider: delivery.provider,
    },
  };
}


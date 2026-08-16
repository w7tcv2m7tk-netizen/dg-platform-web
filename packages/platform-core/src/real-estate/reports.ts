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

function renderAvmLead(
  snapshot: CoreLogicPropertyDetailsSnapshot | null,
): string {
  const lines: string[] = [];
  lines.push(`## Estimated market value range`);
  if (!snapshot) {
    lines.push(
      `_No Cotality Property Details on file yet — match the address, then pull details to load IntelliVal._`,
    );
    return lines.join("\n");
  }
  const avm = snapshot.avm;
  if (avm?.available) {
    if (avm.lowEstimate != null || avm.highEstimate != null) {
      lines.push(
        `**${aud(avm.lowEstimate) ?? "—"} – ${aud(avm.highEstimate) ?? "—"}**`,
      );
    }
    if (avm.estimate != null) {
      lines.push(`- **Indicative estimate:** ${aud(avm.estimate)}`);
    }
    if (avm.confidence != null) lines.push(`- **Confidence:** ${avm.confidence}`);
    if (avm.valuationDate) lines.push(`- **As at:** ${avm.valuationDate}`);
    lines.push(
      `_Source: Cotality IntelliVal AVM. This is an automated estimate — not a formal appraisal or CMA._`,
    );
  } else {
    lines.push(
      `_${avm?.message || "No IntelliVal estimate from Cotality for this property yet."}_`,
    );
    lines.push(
      `_We never invent valuations. When Cotality returns a range it will appear here first._`,
    );
  }
  return lines.join("\n");
}

function renderSalesLead(
  snapshot: CoreLogicPropertyDetailsSnapshot | null,
): string {
  const lines: string[] = [];
  lines.push(`## Recent sales history`);
  if (!snapshot) {
    lines.push(`_Sales history appears after Cotality details are pulled._`);
    return lines.join("\n");
  }
  const lastSale = snapshot.lastSale;
  const salesRows =
    snapshot.salesHistory?.length
      ? snapshot.salesHistory
      : lastSale
        ? [lastSale]
        : [];
  if (salesRows.length) {
    for (const sale of salesRows.slice(0, 8)) {
      const bits: string[] = [];
      if (sale.price != null && !sale.isPriceWithheld) bits.push(aud(sale.price) ?? "");
      else if (sale.isPriceWithheld) bits.push("price withheld");
      if (sale.contractDate) bits.push(`contract ${sale.contractDate}`);
      if (sale.settlementDate) bits.push(`settlement ${sale.settlementDate}`);
      if (sale.type) bits.push(sale.type);
      lines.push(
        `- ${bits.filter(Boolean).join(" · ") || "Sale record (no price/date returned)"}`,
      );
    }
    if (
      snapshot.sections.salesHistory === "unavailable" ||
      snapshot.sections.salesHistory === "error"
    ) {
      lines.push(
        `_Full \`/sales\` history unavailable — showing last sale only when Cotality returned it._`,
      );
    }
  } else {
    lines.push(
      sectionNote(
        snapshot.sections.salesHistory ?? snapshot.sections.lastSale,
        "sales",
      ) || `_No sale records returned by Cotality for this property._`,
    );
  }
  return lines.join("\n");
}

function renderCotalityDetailSections(
  snapshot: CoreLogicPropertyDetailsSnapshot | null,
): string {
  if (!snapshot) {
    return `## Property attributes
_No Cotality Property Details on file. Match the address, then pull details._`;
  }

  const core = snapshot.core;
  const additional = snapshot.additional;
  const site = snapshot.site;
  const lines: string[] = [];

  lines.push(`## Property attributes (Cotality)`);
  lines.push(
    `_Fetched ${new Date(snapshot.fetchedAt).toLocaleString("en-AU")} · Cotality id ${String(snapshot.propertyId)}_`,
  );
  lines.push("");
  if (snapshot.sections.core === "ok" && core) {
    if (core.propertyType) {
      lines.push(`- **Type:** ${core.propertySubType || core.propertyType}`);
    }
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
    if (additional.floorArea != null) {
      lines.push(`- **Floor area:** ${additional.floorArea} m²`);
    }
    if (additional.yearBuilt != null) {
      lines.push(`- **Year built:** ${additional.yearBuilt}`);
    }
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

  return lines.join("\n");
}

function renderCmaUpgradeCta(input: {
  organisationName: string;
  appraisalUrl: string;
}): string {
  return `## Want a full CMA and buyer-demand strategy?

This free report uses Cotality IntelliVal + property details held in DigitalGate.

A **full Comparative Market Analysis (CMA)** — branded comps pack, deeper market positioning, and listing strategy — is available as the next step with ${input.organisationName}. Cotality’s commercial CMA / Digital Property Report APIs power that upgrade once entitled; until then your agent prepares the CMA from live Cotality data in a free appraisal conversation.

**Book a free appraisal & buyer-demand strategy:**
${input.appraisalUrl}

_No obligation. We’ll walk through what the range means for your timing and sale outcome._`;
}

function resolveAppraisalUrl(websiteUrl?: string | null): string {
  const base = (websiteUrl || "https://roerealty.com.au").replace(/\/$/, "");
  try {
    const host = new URL(base).hostname.toLowerCase();
    if (host.includes("roerealty")) {
      return "https://roerealty.com.au/property-appraisal";
    }
  } catch {
    /* fall through */
  }
  return `${base}/property-appraisal`;
}

function avmSubjectHint(
  snapshot: CoreLogicPropertyDetailsSnapshot | null,
): string | null {
  const avm = snapshot?.avm;
  if (!avm?.available) return null;
  if (avm.lowEstimate != null && avm.highEstimate != null) {
    return `${aud(avm.lowEstimate)}–${aud(avm.highEstimate)}`;
  }
  if (avm.estimate != null) return aud(avm.estimate);
  return null;
}

export type PropertyReportPayload = {
  markdown: string;
  plainText: string;
  htmlBody: string;
  organisationName: string;
  address: string;
  cotalityPropertyId: string | number | null;
  detailsFetchedAt: string | null;
  sections: CoreLogicPropertyDetailsSnapshot["sections"] | null;
  partial: boolean;
  /** Present when IntelliVal returned a usable range or estimate. */
  avmRangeLabel: string | null;
  appraisalUrl: string;
};

/**
 * Vendor-facing property report for request follow-up.
 * Leads with IntelliVal range + sales history, then attributes.
 * Positions full CMA as the appraisal upgrade (Cotality commercial Reports API).
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

  if (
    options?.refreshCotality &&
    getPropertyCotalityId({
      metadata: (property.metadata as Record<string, unknown> | null) ?? null,
      externalRefs:
        (property.externalRefs as Record<string, unknown> | null) ?? null,
    })
  ) {
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
    select: { name: true, settings: true },
  });
  const organisationName = org?.name?.trim() || "Your agency";
  const settings =
    org?.settings && typeof org.settings === "object"
      ? (org.settings as Record<string, unknown>)
      : {};
  const profile =
    settings.profile && typeof settings.profile === "object"
      ? (settings.profile as Record<string, unknown>)
      : {};
  const websiteUrl =
    (typeof profile.websiteUrl === "string" && profile.websiteUrl) ||
    (typeof settings.websiteUrl === "string" && settings.websiteUrl) ||
    null;
  const appraisalUrl = resolveAppraisalUrl(websiteUrl);

  const meta = (property.metadata as Record<string, unknown> | null) ?? {};
  const snapshot = getPropertyCotalityDetails({ metadata: meta });
  const cotalityPropertyId = getPropertyCotalityId({
    metadata: meta,
    externalRefs: property.externalRefs as Record<string, unknown> | null,
  });
  const address = formatPropertyAddress(property);
  const avmRangeLabel = avmSubjectHint(snapshot);

  const partial =
    !snapshot ||
    Object.values(snapshot.sections).some((s) => s !== "ok") ||
    (snapshot.avm && !snapshot.avm.available);

  const contactBits = [
    property.bedrooms != null ? `${property.bedrooms} bed` : null,
    property.bathrooms != null ? `${property.bathrooms} bath` : null,
    typeof meta.car_spaces === "number" ? `${meta.car_spaces} car` : null,
  ].filter(Boolean);

  const markdown = `# Property Value & Buyer Demand Report

**${organisationName}**
**${address}**

${contactBits.length ? contactBits.join(" · ") : "_Dwelling attributes shown when Cotality or listing data is available._"}

${renderAvmLead(snapshot)}

${renderSalesLead(snapshot)}

${renderCotalityDetailSections(snapshot)}

${renderCmaUpgradeCta({ organisationName, appraisalUrl })}

## About this report
This free report summarises **Cotality (CoreLogic) property data** held in DigitalGate for ${address}.
It leads with IntelliVal’s estimated value range and recent sales when Cotality returns them.
A full **CMA (Comparative Market Analysis)** is a separate, agent-led upgrade — powered commercially by Cotality’s CMA / Digital Property Report products once entitled, delivered through your free appraisal conversation.

Sections marked unavailable are honest gaps (sandbox/UAT limits or property out of scope) — values are never fabricated.

_Prepared ${new Date().toLocaleString("en-AU")} · Data source: Cotality where indicated._
`.trim();

  const { markdownToEmailHtml } = await import("../communications/email-html");

  return {
    markdown,
    plainText: markdown.replace(/^#+\s*/gm, "").replace(/\*\*/g, ""),
    htmlBody: markdownToEmailHtml(markdown, {
      accentColor: "#C9A46C",
      ctaLabel: "Book a free appraisal",
    }),
    organisationName,
    address,
    cotalityPropertyId,
    detailsFetchedAt: snapshot?.fetchedAt ?? null,
    sections: snapshot?.sections ?? null,
    partial: Boolean(partial),
    avmRangeLabel,
    appraisalUrl,
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

  const subject = report.avmRangeLabel
    ? `Your property value range ${report.avmRangeLabel} — ${report.address}`
    : `Your Property Value Report — ${report.address}`;

  const { sendMessage } = await import("../communications");
  const delivery = await sendMessage({
    organisationId: input.organisationId,
    channel: "email",
    to,
    subject,
    body: report.plainText,
    bodyHtml: report.htmlBody,
    metadata: {
      purpose: "property_report",
      propertyId: input.propertyId,
      appraisalUrl: report.appraisalUrl,
      avmRangeLabel: report.avmRangeLabel,
      ctaLabel: "Book a free appraisal",
      footerNote:
        "Cotality IntelliVal where shown. Not a formal valuation or CMA. Book an appraisal for a full market analysis.",
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
        avmRangeLabel: report.avmRangeLabel,
        appraisalUrl: report.appraisalUrl,
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


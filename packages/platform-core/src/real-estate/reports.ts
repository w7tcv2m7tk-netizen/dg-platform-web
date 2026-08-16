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

function formatReportDate(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return value.trim();
}

function pickRecentRecordedSale(
  snapshot: CoreLogicPropertyDetailsSnapshot | null,
): CoreLogicPropertyDetailsSnapshot["lastSale"] | null {
  if (!snapshot) return null;
  if (snapshot.lastSale) return snapshot.lastSale;
  const first = snapshot.salesHistory?.[0];
  return first || null;
}

function headlineSummary(input: {
  beds?: number | null;
  baths?: number | null;
  cars?: number | null;
  landArea?: number | null;
}): string {
  const bits = [
    input.beds != null ? `${input.beds} bedrooms` : null,
    input.baths != null ? `${input.baths} bathrooms` : null,
    input.cars != null ? `${input.cars} car spaces` : null,
    input.landArea != null
      ? `${input.landArea.toLocaleString("en-AU")} m²`
      : null,
  ].filter(Boolean);
  return bits.join(" · ");
}

function buildPropertyAttributeRows(
  property: {
    bedrooms?: number | null;
    bathrooms?: number | null;
    propertyType?: string | null;
  },
  snapshot: CoreLogicPropertyDetailsSnapshot | null,
  meta: Record<string, unknown>,
): Array<{ label: string; value: string }> {
  const core = snapshot?.core;
  const additional = snapshot?.additional;
  const site = snapshot?.site;
  const cars =
    core?.carSpaces ??
    (typeof meta.car_spaces === "number" ? meta.car_spaces : null);
  const land =
    core?.landArea ??
    (typeof property === "object" &&
    typeof (meta as { land_area?: number }).land_area === "number"
      ? (meta as { land_area: number }).land_area
      : null);

  const buildingArea =
    snapshot?.featureAttributes?.find((f) =>
      /building\s*area/i.test(f.name),
    )?.value || null;

  const rows: Array<{ label: string; value: string }> = [];
  const type =
    core?.propertySubType ||
    core?.propertyType ||
    property.propertyType ||
    null;
  if (type) rows.push({ label: "Property type", value: String(type) });
  const beds = core?.beds ?? property.bedrooms;
  if (beds != null) rows.push({ label: "Bedrooms", value: String(beds) });
  const baths = core?.baths ?? property.bathrooms;
  if (baths != null) rows.push({ label: "Bathrooms", value: String(baths) });
  if (cars != null) rows.push({ label: "Car spaces", value: String(cars) });
  if (land != null) {
    rows.push({
      label: "Land",
      value: `${Number(land).toLocaleString("en-AU")} m²`,
    });
  }
  if (additional?.floorArea != null) {
    rows.push({
      label: "Floor area",
      value: `${additional.floorArea.toLocaleString("en-AU")} m²`,
    });
  }
  if (buildingArea) {
    rows.push({ label: "Building area", value: String(buildingArea) });
  }
  if (additional?.yearBuilt != null) {
    rows.push({ label: "Year built", value: String(additional.yearBuilt) });
  }
  if (site?.landUsePrimary) {
    rows.push({ label: "Land use", value: site.landUsePrimary });
  }
  if (site?.zoneDescriptionLocal || site?.zoneCodeLocal) {
    rows.push({
      label: "Zoning",
      value:
        site.zoneDescriptionLocal ||
        site.zoneCodeLocal ||
        "",
    });
  }
  return rows;
}

function buildVendorReportCopy(input: {
  organisationName: string;
  address: string;
  appraisalUrl: string;
  snapshot: CoreLogicPropertyDetailsSnapshot | null;
  property: {
    bedrooms?: number | null;
    bathrooms?: number | null;
    propertyType?: string | null;
  };
  meta: Record<string, unknown>;
}): {
  plainText: string;
  blocks: import("../communications/email-html").EmailBodyBlock[];
  avmRangeLabel: string | null;
} {
  const snapshot = input.snapshot;
  const avm = snapshot?.avm;
  const avmLive =
    avm && avm.available === true
      ? avm
      : null;
  const avmRangeLabel = avmSubjectHint(snapshot);
  const recentSale = pickRecentRecordedSale(snapshot);
  const core = snapshot?.core;
  const cars =
    core?.carSpaces ??
    (typeof input.meta.car_spaces === "number" ? input.meta.car_spaces : null);
  const land = core?.landArea ?? null;
  const summary = headlineSummary({
    beds: core?.beds ?? input.property.bedrooms,
    baths: core?.baths ?? input.property.bathrooms,
    cars,
    landArea: land,
  });
  const attrRows = buildPropertyAttributeRows(
    input.property,
    snapshot,
    input.meta,
  );

  const blocks: import("../communications/email-html").EmailBodyBlock[] = [
    { type: "kicker", text: input.organisationName },
    {
      type: "heading",
      text: "Your Property Value & Buyer Demand Report",
      level: 1,
    },
    { type: "paragraph", text: input.address },
  ];
  if (summary) {
    blocks.push({ type: "paragraph", text: summary, muted: true });
  }
  blocks.push({ type: "divider" });

  blocks.push({ type: "heading", text: "Your property at a glance", level: 2 });

  if (avmLive) {
    const range =
      avmLive.lowEstimate != null || avmLive.highEstimate != null
        ? `${aud(avmLive.lowEstimate) ?? "—"} – ${aud(avmLive.highEstimate) ?? "—"}`
        : aud(avmLive.estimate) || "Available";
    blocks.push({
      type: "highlight",
      text: `Automated market estimate: ${range}`,
    });
    if (avmLive.confidence != null) {
      blocks.push({
        type: "paragraph",
        text: `Assessment confidence: ${avmLive.confidence}`,
        muted: true,
      });
    }
    blocks.push({
      type: "paragraph",
      text: "This automated estimate is a useful starting point. A local appraisal can refine it with comparable sales, current buyer demand and your property’s individual characteristics.",
    });
  } else {
    blocks.push({
      type: "paragraph",
      text: "This property sits outside the range where an automated valuation can be provided confidently.",
    });
    blocks.push({
      type: "paragraph",
      text: "That doesn’t mean the property can’t be valued.",
    });
    blocks.push({
      type: "paragraph",
      text: "Its landholding, zoning and property characteristics make an agent-led assessment particularly important.",
    });
    blocks.push({
      type: "paragraph",
      text: `Rather than give you an unreliable automated figure, ${input.organisationName} recommends a complimentary market appraisal based on comparable sales, current buyer demand and the property’s individual characteristics.`,
    });
  }

  if (recentSale) {
    blocks.push({ type: "divider" });
    blocks.push({ type: "heading", text: "Recent recorded sale", level: 2 });
    const price =
      recentSale.price != null && !recentSale.isPriceWithheld
        ? aud(recentSale.price)
        : recentSale.isPriceWithheld
          ? "Price withheld"
          : null;
    if (price) {
      blocks.push({ type: "highlight", text: price });
    }
    const saleRows: Array<{ label: string; value: string }> = [];
    const contract = formatReportDate(recentSale.contractDate);
    const settlement = formatReportDate(recentSale.settlementDate);
    if (contract) saleRows.push({ label: "Contract", value: contract });
    if (settlement) saleRows.push({ label: "Settlement", value: settlement });
    if (recentSale.type) saleRows.push({ label: "Sale type", value: recentSale.type });
    if (saleRows.length) blocks.push({ type: "kv", rows: saleRows });
    blocks.push({
      type: "paragraph",
      text: "This is an important reference point — a known recent market result for this property.",
      muted: true,
    });
  }

  if (attrRows.length) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "heading",
      text: "What we know about your property",
      level: 2,
    });
    blocks.push({ type: "kv", rows: attrRows });
    blocks.push({
      type: "paragraph",
      text: "Data supplied by Cotality and property information held within DigitalGate.",
      muted: true,
    });
  }

  blocks.push({ type: "divider" });
  blocks.push({
    type: "heading",
    text: "Your Market Opportunity",
    level: 2,
  });
  const opportunityRows: Array<{ label: string; value: string }> = [];
  if (recentSale?.price != null && !recentSale.isPriceWithheld) {
    opportunityRows.push({
      label: "Recent sale",
      value: aud(recentSale.price) || "—",
    });
  }
  opportunityRows.push({
    label: "Automated estimate",
    value: avmRangeLabel || "Not available",
  });
  opportunityRows.push({
    label: "Assessment confidence",
    value: avmLive
      ? avmLive.confidence != null
        ? String(avmLive.confidence)
        : "Automated estimate available"
      : "Agent review recommended",
  });
  blocks.push({ type: "kv", rows: opportunityRows });

  if (!avmLive) {
    blocks.push({
      type: "heading",
      text: "Why an agent assessment matters",
      level: 2,
    });
    blocks.push({
      type: "paragraph",
      text: land != null
        ? `Your property’s combination of ${land.toLocaleString("en-AU")} m² of land, zoning and its individual characteristics means automated models may have limited confidence.`
        : "Your property’s landholding, zoning and individual characteristics mean automated models may have limited confidence.",
    });
    blocks.push({
      type: "paragraph",
      text: "A local assessment can account for factors that automated systems cannot fully understand.",
    });
  }

  blocks.push({ type: "divider" });
  blocks.push({
    type: "heading",
    text: "What the automated report can’t tell you",
    level: 2,
  });
  blocks.push({
    type: "paragraph",
    text: "Automated valuation models work well when there is sufficient comparable data and a property fits within established market patterns.",
  });
  blocks.push({
    type: "paragraph",
    text: "Large, rural or highly individual properties can require considerably more context.",
  });
  blocks.push({
    type: "paragraph",
    text: "That’s where a Comparative Market Analysis prepared by a local agent becomes more valuable.",
  });
  blocks.push({
    type: "list",
    items: [
      "Comparable Sales — Review relevant recent sales and determine which properties are genuinely comparable.",
      "Buyer Demand — Assess what buyers are currently looking for and how your property may position against competing stock.",
      "Sale Strategy — Determine the likely price positioning, campaign strategy and opportunities to maximise the result.",
    ],
  });

  blocks.push({ type: "divider" });
  blocks.push({ type: "heading", text: "Your next step", level: 2 });
  blocks.push({
    type: "paragraph",
    text: "Find out what your property could realistically achieve in today’s market.",
  });
  blocks.push({
    type: "paragraph",
    text: `Book your complimentary ${input.organisationName} Property Appraisal & Buyer-Demand Strategy.`,
  });
  blocks.push({
    type: "paragraph",
    text: "We’ll review:",
  });
  blocks.push({
    type: "list",
    items: [
      "Recent comparable sales",
      "Current competing properties",
      "Buyer demand",
      "Your property’s unique characteristics",
      "Recommended price positioning",
      "Potential sale strategy",
    ],
  });
  blocks.push({
    type: "button",
    label: "Book my free appraisal →",
    href: input.appraisalUrl,
  });
  blocks.push({
    type: "paragraph",
    text: "No obligation. No pressure. Just a proper conversation about your property and the market.",
    muted: true,
  });

  blocks.push({ type: "divider" });
  blocks.push({ type: "heading", text: "About this report", level: 2 });
  blocks.push({
    type: "paragraph",
    text: "This report combines property information and market data supplied by Cotality with information held within DigitalGate.",
  });
  blocks.push({
    type: "paragraph",
    text: "Automated estimates are provided only where sufficient data is available to produce a meaningful result. Where an automated estimate cannot be provided confidently, we do not manufacture or infer a value.",
  });
  blocks.push({
    type: "paragraph",
    text: "For properties requiring a more detailed assessment, we recommend a complimentary agent-led appraisal and Comparative Market Analysis.",
  });
  blocks.push({
    type: "paragraph",
    text: "Cotality data and automated estimates are provided for indicative purposes only and are not a formal valuation. Market values can vary according to property condition, improvements, location, buyer demand and other factors.",
    muted: true,
  });

  // Plain text twin (no markdown underscores)
  const plain: string[] = [
    input.organisationName,
    "Your Property Value & Buyer Demand Report",
    "",
    input.address,
  ];
  if (summary) plain.push(summary);
  plain.push("", "Your property at a glance", "");
  if (avmLive) {
    plain.push(
      `Automated market estimate: ${avmRangeLabel}`,
      "This automated estimate is a useful starting point. A local appraisal can refine it with comparable sales, current buyer demand and your property’s individual characteristics.",
    );
  } else {
    plain.push(
      "This property sits outside the range where an automated valuation can be provided confidently.",
      "",
      "That doesn’t mean the property can’t be valued.",
      "",
      "Its landholding, zoning and property characteristics make an agent-led assessment particularly important.",
      "",
      `Rather than give you an unreliable automated figure, ${input.organisationName} recommends a complimentary market appraisal based on comparable sales, current buyer demand and the property’s individual characteristics.`,
    );
  }
  if (recentSale) {
    plain.push("", "Recent recorded sale");
    if (recentSale.price != null && !recentSale.isPriceWithheld) {
      plain.push(aud(recentSale.price) || "");
    }
    if (recentSale.contractDate) {
      plain.push(`Contract: ${formatReportDate(recentSale.contractDate)}`);
    }
    if (recentSale.settlementDate) {
      plain.push(`Settlement: ${formatReportDate(recentSale.settlementDate)}`);
    }
    if (recentSale.type) plain.push(`Sale type: ${recentSale.type}`);
  }
  if (attrRows.length) {
    plain.push("", "What we know about your property");
    for (const row of attrRows) plain.push(`${row.label}: ${row.value}`);
    plain.push(
      "",
      "Data supplied by Cotality and property information held within DigitalGate.",
    );
  }
  plain.push(
    "",
    "Your Market Opportunity",
    ...opportunityRows.map((r) => `${r.label}: ${r.value}`),
    "",
    "What the automated report can’t tell you",
    "",
    "Automated valuation models work well when there is sufficient comparable data and a property fits within established market patterns.",
    "",
    "Large, rural or highly individual properties can require considerably more context.",
    "",
    "That’s where a Comparative Market Analysis prepared by a local agent becomes more valuable.",
    "",
    "• Comparable Sales — Review relevant recent sales and determine which properties are genuinely comparable.",
    "• Buyer Demand — Assess what buyers are currently looking for and how your property may position against competing stock.",
    "• Sale Strategy — Determine the likely price positioning, campaign strategy and opportunities to maximise the result.",
    "",
    "Your next step",
    "",
    "Find out what your property could realistically achieve in today’s market.",
    "",
    `Book your complimentary ${input.organisationName} Property Appraisal & Buyer-Demand Strategy.`,
    input.appraisalUrl,
    "",
    "No obligation. No pressure. Just a proper conversation about your property and the market.",
    "",
    "About this report",
    "",
    "This report combines property information and market data supplied by Cotality with information held within DigitalGate.",
    "",
    "Automated estimates are provided only where sufficient data is available to produce a meaningful result. Where an automated estimate cannot be provided confidently, we do not manufacture or infer a value.",
    "",
    "For properties requiring a more detailed assessment, we recommend a complimentary agent-led appraisal and Comparative Market Analysis.",
    "",
    "Cotality data and automated estimates are provided for indicative purposes only and are not a formal valuation. Market values can vary according to property condition, improvements, location, buyer demand and other factors.",
  );

  return {
    plainText: plain.filter((l) => l != null && l !== "").join("\n").replace(/\n{3,}/g, "\n\n"),
    blocks,
    avmRangeLabel,
  };
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
 * Vendor-facing Property Value & Buyer Demand Report.
 * Positions Cotality data as useful context, turns AVM gaps into appraisal CTA,
 * and never invents valuations or comparable sales lists.
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

  const partial =
    !snapshot ||
    Object.values(snapshot.sections).some((s) => s !== "ok") ||
    (snapshot.avm && !snapshot.avm.available);

  const copy = buildVendorReportCopy({
    organisationName,
    address,
    appraisalUrl,
    snapshot,
    property: {
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      propertyType: property.propertyType,
    },
    meta,
  });

  const { composeEmailBody } = await import("../communications/email-html");
  const htmlBody = composeEmailBody(copy.blocks, { accentColor: "#C9A46C" });

  return {
    markdown: copy.plainText,
    plainText: copy.plainText,
    htmlBody,
    organisationName,
    address,
    cotalityPropertyId,
    detailsFetchedAt: snapshot?.fetchedAt ?? null,
    sections: snapshot?.sections ?? null,
    partial: Boolean(partial),
    avmRangeLabel: copy.avmRangeLabel,
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
    ? `Your Property Value & Buyer Demand Report ${report.avmRangeLabel} — ${report.address}`
    : `Your Property Value & Buyer Demand Report — ${report.address}`;

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
      ctaLabel: "Book my free appraisal →",
      footerNote:
        "Cotality data and automated estimates are indicative only and are not a formal valuation.",
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


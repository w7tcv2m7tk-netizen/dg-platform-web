/**
 * Public Gen 2 property-report funnel (Roe):
 * resolve address → capture lead → Cotality report email → follow-up sequence stamp.
 */

import type { Prisma } from "@dg/database";

import { resolveAddress } from "../addresses";
import { sendMessage } from "../communications";
import { upsertLeadFromPublicCapture } from "../leads/public-capture";
import {
  createPropertyFromLead,
  getPropertyCotalityId,
  matchPropertyWithCotality,
  pullCotalityPropertyDetails,
} from "../properties";
import { sendPropertyReportEmail } from "./reports";
import {
  adminPropertyReportNotifyBody,
  buildPropertyReportSequenceStamp,
  duePropertyReportFollowupSteps,
  renderPropertyReportFollowup,
  type PropertyReportSequenceMeta,
} from "./property-report-emails";
import { getWebsiteBySlug } from "../websites/crud";
import { findDomainByHostname } from "../infrastructure/domains/inventory";

export type PublicPropertyReportResolveResult =
  | {
      ok: true;
      formatted: string;
      rawAddress: string;
      addressLine1: string;
      suburb: string;
      state: string;
      postcode: string;
      corelogicPropertyId: string | number | null;
      matched: boolean;
    }
  | { ok: false; code: string; message: string };

export type PublicPropertyReportSubmitResult =
  | {
      ok: true;
      leadId: string;
      propertyId: string | null;
      reportSent: boolean;
      reportPartial: boolean | null;
      message: string;
    }
  | { ok: false; code: string; message: string };

async function resolveOrgId(input: {
  siteSlug?: string;
  hostname?: string;
}): Promise<string | null> {
  const slug = input.siteSlug?.trim() || "roe-realty";
  const site =
    (await getWebsiteBySlug(slug, { publishedOnly: true })) ||
    (await getWebsiteBySlug(slug));
  if (site?.organisationId) return site.organisationId;

  if (input.hostname?.trim()) {
    const found = await findDomainByHostname(input.hostname.trim());
    if (found?.website?.organisationId) {
      return found.website.organisationId;
    }
  }

  const { resolveOrganisationIdForReSync } = await import(
    "../leads/public-capture"
  );
  return resolveOrganisationIdForReSync({ siteUrl: `https://${slug}` });
}

export async function resolvePublicPropertyReportAddress(input: {
  rawAddress: string;
  siteSlug?: string;
  hostname?: string;
}): Promise<PublicPropertyReportResolveResult> {
  const raw = input.rawAddress?.trim();
  if (!raw) {
    return { ok: false, code: "validation_error", message: "Address is required" };
  }

  const orgId = await resolveOrgId(input);
  if (!orgId) {
    return {
      ok: false,
      code: "org_not_resolved",
      message: "Could not resolve agency organisation for this site",
    };
  }

  const resolved = await resolveAddress(raw, {
    geocode: true,
    corelogic: true,
    regionBias: "Gold Coast, QLD, Australia",
  });

  const cotalityId = resolved.metadata.corelogic_property_id;
  const matched =
    cotalityId != null && cotalityId !== ""
      ? true
      : false;

  return {
    ok: true,
    formatted: resolved.formatted || raw,
    rawAddress: raw,
    addressLine1: resolved.addressLine1,
    suburb: resolved.suburb,
    state: resolved.state,
    postcode: resolved.postcode,
    corelogicPropertyId: matched ? (cotalityId as string | number) : null,
    matched,
  };
}

export async function submitPublicPropertyReport(input: {
  siteSlug?: string;
  hostname?: string;
  propertyAddress: string;
  fullName: string;
  email?: string;
  phone?: string;
  propertyType?: string;
  timeframe?: string;
  website?: string;
}): Promise<PublicPropertyReportSubmitResult> {
  // Honeypot
  if (input.website?.trim()) {
    return {
      ok: true,
      leadId: "honeypot",
      propertyId: null,
      reportSent: false,
      reportPartial: null,
      message: "Report request received.",
    };
  }

  const fullName = input.fullName?.trim() || "";
  const email = input.email?.trim() || "";
  const phone = input.phone?.trim() || "";
  const propertyAddress = input.propertyAddress?.trim() || "";
  const propertyType = input.propertyType?.trim() || "";
  const timeframe = input.timeframe?.trim() || "";

  if (!fullName) {
    return { ok: false, code: "validation_error", message: "Full name is required." };
  }
  if (!email && !phone) {
    return {
      ok: false,
      code: "validation_error",
      message: "Please provide either an email or mobile number.",
    };
  }
  if (!propertyAddress) {
    return {
      ok: false,
      code: "validation_error",
      message: "Property address is required.",
    };
  }

  const organisationId = await resolveOrgId(input);
  if (!organisationId) {
    return {
      ok: false,
      code: "org_not_resolved",
      message: "Could not resolve agency organisation for this site",
    };
  }

  const firstName = fullName.split(/\s+/)[0] || fullName;
  const submittedAt = new Date().toLocaleString("en-AU");

  // Re-resolve with Cotality so lead metadata gets ids
  const resolved = await resolveAddress(propertyAddress, {
    geocode: true,
    corelogic: true,
    regionBias: "Gold Coast, QLD, Australia",
  });
  const formatted =
    resolved.formatted || propertyAddress;

  const leadResult = await upsertLeadFromPublicCapture({
    organisationId,
    leadType: "vendor",
    name: fullName,
    email: email || undefined,
    phone: phone || undefined,
    propertyAddress: formatted,
    source: "property_report",
    stage: "vendor_lead",
    notes: [
      "Submitted via Gen 2 Property Report form.",
      propertyType ? `Property type: ${propertyType}` : null,
      timeframe ? `Timeframe: ${timeframe}` : null,
    ]
      .filter(Boolean)
      .join(" "),
  });

  if (!leadResult.ok) {
    return {
      ok: false,
      code: leadResult.code,
      message: leadResult.message,
    };
  }

  const leadId = leadResult.leadId;

  // Enrich lead metadata with Cotality + capture path
  const { prisma } = await import("@dg/database");
  const lead = await prisma.lead.findFirst({ where: { id: leadId } });
  if (lead) {
    const prev = (lead.metadata as Record<string, unknown> | null) ?? {};
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        metadata: {
          ...prev,
          ...resolved.metadata,
          property_address: formatted,
          property_formatted: formatted,
          contact_name: fullName,
          email: email || prev.email,
          phone: phone || prev.phone,
          capture_path: "gen2_public_property_report",
          property_type: propertyType || undefined,
          sell_timeframe: timeframe || undefined,
        } as Prisma.InputJsonValue,
        externalRefs: {
          ...((lead.externalRefs as Record<string, unknown> | null) ?? {}),
          capture_path: "gen2_public_property_report",
        } as Prisma.InputJsonValue,
      },
    });
  }

  let propertyId: string | null = null;
  try {
    const property = await createPropertyFromLead({
      organisationId,
      leadId,
    });
    propertyId = property?.id ?? null;
  } catch (err) {
    console.error("[public-property-report] createPropertyFromLead failed", err);
  }

  if (propertyId) {
    const cotalityId = getPropertyCotalityId({
      metadata: resolved.metadata,
      externalRefs: resolved.metadata.corelogic_property_id
        ? { corelogic_property_id: resolved.metadata.corelogic_property_id }
        : null,
    });
    if (!cotalityId) {
      const matched = await matchPropertyWithCotality(organisationId, propertyId);
      if (!matched.ok) {
        console.info("[public-property-report] cotality match skipped", matched.message);
      }
    } else {
      await pullCotalityPropertyDetails(organisationId, propertyId).catch((err) => {
        console.info("[public-property-report] cotality pull failed", err);
      });
    }
  }

  let reportSent = false;
  let reportPartial: boolean | null = null;

  if (email && propertyId) {
    const sent = await sendPropertyReportEmail({
      organisationId,
      propertyId,
      to: email,
      refreshCotality: true,
    });
    if (sent.ok) {
      reportSent = true;
      reportPartial = sent.report.partial;
    } else {
      console.info("[public-property-report] report email failed", sent.message);
    }
  }

  if (email) {
    const sequence = buildPropertyReportSequenceStamp({
      firstName,
      fullName,
      propertyAddress: formatted,
      email,
      email1Sent: reportSent,
    });
    const current = await prisma.lead.findFirst({ where: { id: leadId } });
    if (current) {
      const prev = (current.metadata as Record<string, unknown> | null) ?? {};
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          metadata: {
            ...prev,
            property_report_sequence: sequence,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  // Admin notify
  const adminTo =
    process.env.DG_PROPERTY_REPORT_ADMIN_EMAIL?.trim() ||
    "enquiries@roerealty.com.au";
  const adminMail = adminPropertyReportNotifyBody({
    fullName,
    propertyAddress: formatted,
    email: email || "Not provided",
    phone: phone || "Not provided",
    submittedAt,
  });
  try {
    await sendMessage({
      organisationId,
      channel: "email",
      to: adminTo,
      subject: adminMail.subject,
      body: adminMail.body,
      bodyHtml: adminMail.bodyHtml,
      metadata: { purpose: "property_report_admin" },
    });
  } catch (err) {
    console.info("[public-property-report] admin notify failed", err);
  }

  const message = reportSent
    ? reportPartial
      ? "Your Property Value & Buyer Demand Report is on its way. We'll follow up with next steps."
      : "Your Property Value & Buyer Demand Report is on its way — check your inbox shortly."
    : email
      ? "Report request received! We'll be in touch within 2 hours."
      : "Report request received! We'll be in touch within 2 hours.";

  return {
    ok: true,
    leadId,
    propertyId,
    reportSent,
    reportPartial,
    message,
  };
}

/**
 * Process due property-report follow-up emails 2–5 across orgs.
 */
export async function processPropertyReportFollowups(options?: {
  limit?: number;
}): Promise<{ processed: number; sent: number; failed: number }> {
  const { prisma } = await import("@dg/database");
  const limit = options?.limit ?? 40;

  // Prefer property_report source; also catch any lead with sequence stamp
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { source: "property_report" },
        {
          metadata: {
            path: ["capture_path"],
            equals: "gen2_public_property_report",
          },
        },
      ],
    },
    take: 300,
    orderBy: { updatedAt: "asc" },
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;
  const now = new Date();

  for (const lead of leads) {
    if (processed >= limit) break;
    const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
    const sequence = meta.property_report_sequence as
      | PropertyReportSequenceMeta
      | undefined;
    if (!sequence?.email || !sequence.activatedAt) continue;

    const due = duePropertyReportFollowupSteps(sequence, now);
    if (!due.length) continue;

    for (const step of due) {
      if (processed >= limit) break;
      processed += 1;
      const rendered = renderPropertyReportFollowup(step, {
        firstName: sequence.firstName,
        fullName: sequence.fullName,
        propertyAddress: sequence.propertyAddress,
        email: sequence.email,
      });

      try {
        const delivery = await sendMessage({
          organisationId: lead.organisationId,
          channel: "email",
          to: sequence.email,
          subject: rendered.subject,
          body: rendered.body,
          bodyHtml: rendered.bodyHtml,
          metadata: {
            purpose: `property_report_followup_${step}`,
            leadId: lead.id,
            ctaLabel: "Book a free appraisal",
          },
        });

        const nextSeq: PropertyReportSequenceMeta = {
          ...sequence,
          [`email_${step}_sent`]: true,
          [`email_${step}_sent_at`]: new Date().toISOString(),
        } as PropertyReportSequenceMeta;

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            metadata: {
              ...meta,
              property_report_sequence: nextSeq,
            } as Prisma.InputJsonValue,
          },
        });

        await prisma.activity.create({
          data: {
            organisationId: lead.organisationId,
            entityType: "Lead",
            entityId: lead.id,
            activityType:
              delivery.status === "sent" ? "email_sent" : "email_queued",
            title: `Property report follow-up ${step}`,
            body: `${sequence.email} · ${rendered.subject}`,
            sourceApp: "real-estate",
            metadata: {
              step,
              deliveryId: delivery.id,
              deliveryStatus: delivery.status,
            } as Prisma.InputJsonValue,
          },
        });

        if (delivery.status === "failed") failed += 1;
        else sent += 1;

        // Refresh local sequence for next step on same lead
        Object.assign(sequence, nextSeq);
      } catch (err) {
        failed += 1;
        console.error("[property-report-followups] send failed", lead.id, step, err);
      }
    }
  }

  return { processed, sent, failed };
}

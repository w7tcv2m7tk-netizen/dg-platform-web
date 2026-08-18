/**
 * Gen 2 enquiry capture — Contact + Founding + Consultation forms.
 *
 * Replaces the three broken WordPress endpoints:
 *   /inc/send-dg-enquiry.php  (Contact, Founding 10)
 *   /wp-admin/admin-ajax.php  (Platform Consultation booking)
 *
 * Creates a CRM Contact (upserts by email) and a Lead with rich metadata,
 * then sends Ben an admin notification email.
 */

import { createContact } from "../contacts";
import { createLead } from "../leads";
import { sendMessage, composeEmailBody, type EmailBodyBlock } from "../communications";
import { getWebsiteBySlug } from "../websites/crud";
import { DG_CONSULT_ZOOM_URL } from "./consultation-emails";
import { assertConsultationSlotAvailable } from "./consultation-availability";

export type DgEnquiryType = "contact" | "founding_10" | "consultation";

export interface DgEnquiryInput {
  type: DgEnquiryType;
  name: string;
  email: string;
  phone?: string;
  /** Founding + Contact */
  businessName?: string;
  website?: string;
  industry?: string;
  teamSize?: string;
  currentSystems?: string;
  /** Founding */
  wantToSolve?: string;
  appsInterest?: string[];
  agreedFoundingTerms?: boolean;
  /** Contact */
  interestedIn?: string[];
  achieve?: string[];
  heardAbout?: string;
  /** Shared freeform */
  message?: string;
  /** Consultation booking */
  date?: string;
  time?: string;
  notes?: string;
  /** Honeypot — reject if set */
  honeypot?: string;
  siteSlug?: string;
}

export type DgEnquiryResult =
  | { ok: true; contactId: string; leadId: string }
  | { ok: false; code: string; message: string };

function titleFor(input: DgEnquiryInput): string {
  const biz = input.businessName?.trim();
  const who = biz ? `${input.name.trim()} (${biz})` : input.name.trim();
  if (input.type === "founding_10") return `Founding 10 application — ${who}`;
  if (input.type === "consultation") return `Platform consultation — ${who}`;
  return `Contact enquiry — ${who}`;
}

function descriptionFor(input: DgEnquiryInput): string {
  const parts: string[] = [];
  if (input.message?.trim()) parts.push(input.message.trim());
  if (input.wantToSolve?.trim()) parts.push(`What they want to solve: ${input.wantToSolve.trim()}`);
  if (input.notes?.trim()) parts.push(`Notes: ${input.notes.trim()}`);
  if (input.appsInterest?.length)
    parts.push(`Apps interested in: ${input.appsInterest.join(", ")}`);
  if (input.interestedIn?.length)
    parts.push(`Interested in: ${input.interestedIn.join(", ")}`);
  if (input.achieve?.length)
    parts.push(`Wants to achieve: ${input.achieve.join(", ")}`);
  if (input.date?.trim() || input.time?.trim())
    parts.push(`Requested slot: ${[input.date, input.time].filter(Boolean).join(" ")}`);
  return parts.join("\n\n");
}

async function resolveOrgId(siteSlug: string): Promise<string | null> {
  const site =
    (await getWebsiteBySlug(siteSlug, { publishedOnly: true })) ||
    (await getWebsiteBySlug(siteSlug));
  if (site?.organisationId) return site.organisationId;
  const { prisma } = await import("@dg/database");
  const { resolveOrgBrandPresetKey } = await import("../org/brand-presets");
  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true, slug: true, industry: true, settings: true },
    take: 100,
  });
  for (const org of orgs) {
    if (resolveOrgBrandPresetKey(org) === "digitalgate") return org.id;
  }
  return null;
}

export async function captureDgEnquiry(
  input: DgEnquiryInput,
): Promise<DgEnquiryResult> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, code: "database_not_configured", message: "DATABASE_URL not set" };
  }

  // Honeypot check
  if (input.honeypot?.trim()) {
    return { ok: true, contactId: "hp", leadId: "hp" };
  }

  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!name) return { ok: false, code: "validation_error", message: "name is required" };
  if (!email) return { ok: false, code: "validation_error", message: "email is required" };

  const siteSlug = input.siteSlug?.trim() || "digitalgate";
  const organisationId = await resolveOrgId(siteSlug);
  if (!organisationId) {
    return { ok: false, code: "not_found", message: "DigitalGate organisation not found" };
  }

  if (input.type === "consultation") {
    const slot = await assertConsultationSlotAvailable({
      organisationId,
      dateIso: input.date,
      time: input.time,
      description: descriptionFor(input),
    });
    if (!slot.ok) return slot;
  }

  const { prisma } = await import("@dg/database");
  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0] || "Unknown";
  const lastName = nameParts.slice(1).join(" ") || undefined;

  let contactId: string | undefined;
  const existing = await prisma.contact.findFirst({
    where: { organisationId, email, deletedAt: null },
  });
  contactId = existing?.id;

  if (!contactId) {
    const contact = await createContact({
      organisationId,
      firstName,
      lastName,
      email,
      phone: input.phone?.trim() || undefined,
      source: "website_form",
    });
    contactId = contact.id;
  }

  const lead = await createLead({
    organisationId,
    source: "website_form",
    title: titleFor(input),
    description: descriptionFor(input),
    contactId,
    status: "new",
    metadata: {
      lead_type: input.type,
      stage: "new",
      capture_path: "gen2_dg_enquiry",
      site_slug: siteSlug,
      contact_name: name,
      email,
      phone: input.phone?.trim() || undefined,
      business_name: input.businessName?.trim() || undefined,
      website: input.website?.trim() || undefined,
      industry: input.industry?.trim() || undefined,
      team_size: input.teamSize?.trim() || undefined,
      current_systems: input.currentSystems?.trim() || undefined,
      want_to_solve: input.wantToSolve?.trim() || undefined,
      apps_interest: input.appsInterest?.length ? input.appsInterest : undefined,
      interested_in: input.interestedIn?.length ? input.interestedIn : undefined,
      achieve: input.achieve?.length ? input.achieve : undefined,
      heard_about: input.heardAbout?.trim() || undefined,
      agreed_founding_terms: input.agreedFoundingTerms ?? undefined,
      requested_date: input.date?.trim() || undefined,
      requested_time: input.time?.trim() || undefined,
      meeting_link:
        input.type === "consultation" ? DG_CONSULT_ZOOM_URL : undefined,
      message: input.message?.trim() || undefined,
    },
  });

  // Admin notification email to Ben
  const adminTo =
    process.env.DG_ENQUIRY_ADMIN_EMAIL?.trim() ||
    process.env.DG_BUSINESS_AUDIT_ADMIN_EMAIL?.trim() ||
    "hello@digitalgate.com.au";

  const typeLabel =
    input.type === "founding_10"
      ? "Founding 10 Application"
      : input.type === "consultation"
        ? "Platform Consultation"
        : "Contact Enquiry";

  const kvRows: { label: string; value: string }[] = [
    { label: "Type", value: typeLabel },
    { label: "Name", value: name },
    { label: "Email", value: email },
  ];
  if (input.phone?.trim()) kvRows.push({ label: "Phone", value: input.phone.trim() });
  if (input.businessName?.trim()) kvRows.push({ label: "Business", value: input.businessName.trim() });
  if (input.website?.trim()) kvRows.push({ label: "Website", value: input.website.trim() });
  if (input.industry?.trim()) kvRows.push({ label: "Industry", value: input.industry.trim() });
  if (input.teamSize?.trim()) kvRows.push({ label: "Team size", value: input.teamSize.trim() });
  if (input.date?.trim()) kvRows.push({ label: "Requested date", value: input.date.trim() });
  if (input.time?.trim()) kvRows.push({ label: "Requested time", value: input.time.trim() });

  const bodyBlocks: EmailBodyBlock[] = [
    { type: "kicker", text: "New lead" },
    { type: "heading", text: typeLabel },
    { type: "kv", rows: kvRows },
  ];
  if (descriptionFor(input).trim()) {
    bodyBlocks.push({ type: "paragraph", text: descriptionFor(input).trim() });
  }

  try {
    await sendMessage({
      organisationId,
      channel: "email",
      to: adminTo,
      subject: `${typeLabel} — ${name}${input.businessName?.trim() ? ` (${input.businessName.trim()})` : ""}`,
      body: `New ${typeLabel}\n\nName: ${name}\nEmail: ${email}${input.phone ? `\nPhone: ${input.phone}` : ""}${input.businessName ? `\nBusiness: ${input.businessName}` : ""}\n\n${descriptionFor(input)}`,
      bodyHtml: composeEmailBody(bodyBlocks),
      metadata: { purpose: "dg_enquiry_admin_notify", lead_type: input.type },
    });
  } catch (err) {
    console.warn("[dg-enquiry-capture] admin notify failed", err);
  }

  return { ok: true, contactId, leadId: lead.id };
}

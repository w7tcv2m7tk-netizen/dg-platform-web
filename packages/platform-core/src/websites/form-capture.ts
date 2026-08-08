/**
 * Public website contact form → Contact + Lead in CRM.
 */

import { createContact } from "../contacts";
import { createLead } from "../leads";
import { getWebsiteBySlug } from "./crud";

export type WebsiteFormCaptureInput = {
  siteSlug: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  pageSlug?: string;
};

export type WebsiteFormCaptureResult =
  | {
      ok: true;
      contactId: string;
      leadId: string;
    }
  | { ok: false; code: string; message: string };

export async function captureWebsiteFormSubmission(
  input: WebsiteFormCaptureInput,
): Promise<WebsiteFormCaptureResult> {
  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      code: "database_not_configured",
      message: "DATABASE_URL not set",
    };
  }

  const name = input.name?.trim();
  if (!name) {
    return { ok: false, code: "validation_error", message: "name is required" };
  }
  if (!input.email?.trim() && !input.phone?.trim()) {
    return {
      ok: false,
      code: "validation_error",
      message: "email or phone is required",
    };
  }

  const site = await getWebsiteBySlug(input.siteSlug, { publishedOnly: true });
  if (!site) {
    // Allow draft preview submissions for Studio testing
    const draft = await getWebsiteBySlug(input.siteSlug);
    if (!draft) {
      return { ok: false, code: "not_found", message: "Website not found" };
    }
    return captureForWebsite(draft.organisationId, draft.id, draft.slug, input);
  }

  return captureForWebsite(site.organisationId, site.id, site.slug, input);
}

async function captureForWebsite(
  organisationId: string,
  websiteId: string,
  siteSlug: string,
  input: WebsiteFormCaptureInput,
): Promise<WebsiteFormCaptureResult> {
  const { prisma } = await import("@dg/database");
  const email = input.email?.trim().toLowerCase() || undefined;
  const phone = input.phone?.trim() || undefined;

  let contactId: string | undefined;
  if (email) {
    const existing = await prisma.contact.findFirst({
      where: { organisationId, email, deletedAt: null },
    });
    contactId = existing?.id;
  }

  if (!contactId) {
    const parts = nameParts(input.name);
    const contact = await createContact({
      organisationId,
      firstName: parts.firstName,
      lastName: parts.lastName,
      email,
      phone,
      source: "website_form",
    });
    contactId = contact.id;
  }

  const lead = await createLead({
    organisationId,
    source: "website_form",
    title: `Website enquiry — ${input.name.trim()}`,
    description: input.message?.trim() || undefined,
    contactId,
    status: "new",
    metadata: {
      lead_type: "enquiry",
      stage: "new",
      website_id: websiteId,
      site_slug: siteSlug,
      page_slug: input.pageSlug ?? null,
      contact_name: input.name.trim(),
      email,
      phone,
      capture_path: "website_builder_form",
    },
  });

  return { ok: true, contactId, leadId: lead.id };
}

function nameParts(name: string): { firstName: string; lastName?: string } {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] || "Unknown",
    lastName: parts.slice(1).join(" ") || undefined,
  };
}

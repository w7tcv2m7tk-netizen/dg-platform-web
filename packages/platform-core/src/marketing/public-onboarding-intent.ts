/**
 * Gen 2 signup onboarding intent — replaces WP POST `/wp-json/digitalgate/v1/onboarding`.
 * Used by /api/onboarding before the user creates a Clerk account.
 */

import { createContact } from "../contacts";
import { createLead } from "../leads";
import { getWebsiteBySlug } from "../websites/crud";

export type PublicOnboardingIntentInput = {
  business_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  abn?: string;
  gst_number?: string;
  industry_license_number?: string;
  industry_vertical?: string;
  platform_tier?: string;
  purchased_apps?: string[];
  purchased_premium?: string[];
  purchased_addons?: string[];
  source?: string;
  siteSlug?: string;
};

export type PublicOnboardingIntentResult =
  | { ok: true; contactId: string; leadId: string }
  | { ok: false; code: string; message: string };

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

export async function capturePublicOnboardingIntent(
  input: PublicOnboardingIntentInput,
): Promise<PublicOnboardingIntentResult> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, code: "database_not_configured", message: "DATABASE_URL not set" };
  }

  const businessName = input.business_name?.trim();
  const contactName = input.contact_name?.trim();
  const email = input.contact_email?.trim().toLowerCase();
  if (!businessName || !contactName || !email) {
    return {
      ok: false,
      code: "validation_error",
      message: "business_name, contact_name, and contact_email are required",
    };
  }

  const siteSlug = input.siteSlug?.trim() || "digitalgate";
  const organisationId = await resolveOrgId(siteSlug);
  if (!organisationId) {
    return { ok: false, code: "not_found", message: "DigitalGate organisation not found" };
  }

  const nameParts = contactName.split(/\s+/);
  const firstName = nameParts[0] || contactName;
  const lastName = nameParts.slice(1).join(" ") || undefined;

  const { prisma } = await import("@dg/database");
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
      phone: input.contact_phone?.trim() || undefined,
      source: "onboarding_intent",
    });
    contactId = contact.id;
  }

  const lead = await createLead({
    organisationId,
    source: "onboarding_intent",
    title: `Signup plan selection — ${businessName}`,
    description: `Platform tier: ${input.platform_tier ?? "—"}`,
    contactId,
    status: "new",
    metadata: {
      lead_type: "onboarding_intent",
      capture_path: "gen2_api_onboarding",
      business_name: businessName,
      contact_name: contactName,
      email,
      contact_phone: input.contact_phone?.trim() || undefined,
      abn: input.abn?.trim() || undefined,
      gst_number: input.gst_number?.trim() || undefined,
      industry_license_number: input.industry_license_number?.trim() || undefined,
      industry_vertical: input.industry_vertical?.trim() || undefined,
      platform_tier: input.platform_tier?.trim() || undefined,
      purchased_apps: input.purchased_apps?.length ? input.purchased_apps : undefined,
      purchased_premium: input.purchased_premium?.length ? input.purchased_premium : undefined,
      purchased_addons: input.purchased_addons?.length ? input.purchased_addons : undefined,
      source: input.source?.trim() || "dg-platform-web",
    },
  });

  return { ok: true, contactId, leadId: lead.id };
}

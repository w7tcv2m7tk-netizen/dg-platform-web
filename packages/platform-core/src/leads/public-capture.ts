/**
 * Public / WP dual-write lead capture (WP-D-103).
 * Idempotent on externalRefs.wp_vendor_lead_id / wp_buyer_lead_id.
 */

import type { Prisma } from "@dg/database";

import { enrichLeadAddressMetadata, resolveAddress } from "../addresses";
import { createContact } from "../contacts";
import { createLead } from "./index";

export type PublicLeadCaptureInput = {
  organisationId: string;
  leadType: "vendor" | "buyer";
  wpLeadId?: number;
  name?: string;
  email?: string;
  phone?: string;
  propertyAddress?: string;
  propertyUrl?: string;
  source?: string;
  stage?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
  actorId?: string;
};

export type PublicLeadCaptureResult =
  | { ok: true; outcome: "created" | "updated" | "skipped"; leadId: string }
  | { ok: false; code: string; message: string };

export async function resolveOrganisationIdForReSync(input?: {
  organisationId?: string;
  siteUrl?: string;
}): Promise<string | null> {
  const explicit = input?.organisationId?.trim();
  if (explicit) return explicit;

  const envId =
    process.env.DG_RE_ORGANISATION_ID?.trim() ||
    process.env.DG_ROE_ORGANISATION_ID?.trim();
  if (envId) return envId;

  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  const { resolveOrgBrandPresetKey } = await import("../org/brand-presets");

  let targetHost = "roerealty.com.au";
  if (input?.siteUrl?.trim()) {
    try {
      targetHost = new URL(input.siteUrl.trim()).hostname.toLowerCase();
    } catch {
      /* keep default */
    }
  }

  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true, slug: true, industry: true, settings: true },
    take: 200,
  });

  for (const org of orgs) {
    if (resolveOrgBrandPresetKey(org) === "roe-realty") return org.id;
  }

  for (const org of orgs) {
    const base = (
      org.settings as { connectors?: { wordpress?: { baseUrl?: string } } } | null
    )?.connectors?.wordpress?.baseUrl;
    if (!base) continue;
    try {
      if (new URL(base).hostname.toLowerCase() === targetHost) return org.id;
    } catch {
      if (base.toLowerCase().includes(targetHost)) return org.id;
    }
  }

  return null;
}

async function resolveContactId(
  organisationId: string,
  actorId: string | undefined,
  input: PublicLeadCaptureInput,
): Promise<string | undefined> {
  const email = input.email?.trim().toLowerCase();
  const phone = input.phone?.trim();
  if (!email && !phone) return undefined;

  const { prisma } = await import("@dg/database");
  if (email) {
    const byEmail = await prisma.contact.findFirst({
      where: { organisationId, email, deletedAt: null },
    });
    if (byEmail) return byEmail.id;
  }

  const parts = (input.name ?? "Unknown").trim().split(/\s+/);
  const created = await createContact({
    organisationId,
    actorId,
    firstName: parts[0] ?? "Unknown",
    lastName: parts.slice(1).join(" ") || undefined,
    email: email || undefined,
    phone: phone || undefined,
    source: input.source ?? "wordpress",
  });
  return created.id;
}

/** Upsert a vendor/buyer lead from WP form dual-write or public capture. */
export async function upsertLeadFromPublicCapture(
  input: PublicLeadCaptureInput,
): Promise<PublicLeadCaptureResult> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, code: "database_not_configured", message: "DATABASE_URL not set" };
  }

  const name = input.name?.trim();
  const propertyAddress = input.propertyAddress?.trim() ?? "";
  if (!name && !propertyAddress) {
    return {
      ok: false,
      code: "validation_error",
      message: "name or propertyAddress required",
    };
  }
  if (!input.email?.trim() && !input.phone?.trim()) {
    return {
      ok: false,
      code: "validation_error",
      message: "email or phone required",
    };
  }

  const isBuyer = input.leadType === "buyer";
  const wpId =
    typeof input.wpLeadId === "number" && Number.isFinite(input.wpLeadId)
      ? input.wpLeadId
      : null;
  const externalKey = isBuyer ? "wp_buyer_lead_id" : "wp_vendor_lead_id";

  const { prisma } = await import("@dg/database");

  let existing = null as Awaited<ReturnType<typeof prisma.lead.findFirst>>;
  if (wpId != null) {
    existing = await prisma.lead.findFirst({
      where: {
        organisationId: input.organisationId,
        externalRefs: { path: [externalKey], equals: wpId },
      },
    });
  }

  const contactId = await resolveContactId(input.organisationId, input.actorId, input);
  if (contactId) {
    const { ensureReContactRole } = await import("../real-estate/contact-roles");
    await ensureReContactRole({
      organisationId: input.organisationId,
      contactId,
      role: isBuyer ? "buyer" : "vendor",
    });
  }

  let metadata: Record<string, unknown> = {
    lead_type: isBuyer ? "buyer" : "vendor",
    stage: input.stage ?? (isBuyer ? "inquiry" : "vendor_lead"),
    property_address: propertyAddress || undefined,
    property_url: input.propertyUrl?.trim() || undefined,
    contact_name: name,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    wp_name: name,
    capture_path: "wp_dual_write",
  };

  if (propertyAddress) {
    const resolved = await resolveAddress(propertyAddress, { geocode: true });
    metadata = enrichLeadAddressMetadata(metadata, resolved);
  }

  const title =
    (typeof metadata.property_formatted === "string" && metadata.property_formatted) ||
    propertyAddress ||
    name ||
    (wpId != null ? `Lead #${wpId}` : "New lead");

  const source = isBuyer ? "buyer_enquiry" : input.source?.trim() || "property_report";

  if (existing) {
    const prevMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
    const stageChanged = prevMeta.stage !== metadata.stage;
    const addressChanged = prevMeta.property_address !== metadata.property_address;
    if (!stageChanged && !addressChanged && existing.title === title) {
      return { ok: true, outcome: "skipped", leadId: existing.id };
    }

    await prisma.lead.update({
      where: { id: existing.id },
      data: {
        title,
        description: input.notes?.trim() || propertyAddress || existing.description,
        contactId: contactId ?? existing.contactId,
        status: input.status ?? existing.status,
        metadata: { ...prevMeta, ...metadata } as Prisma.InputJsonValue,
        externalRefs: {
          ...((existing.externalRefs as Record<string, unknown> | null) ?? {}),
          ...(wpId != null ? { [externalKey]: wpId } : {}),
          wp_created_at: input.createdAt,
          wp_synced_at: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
    return { ok: true, outcome: "updated", leadId: existing.id };
  }

  const lead = await createLead({
    organisationId: input.organisationId,
    actorId: input.actorId,
    source,
    title,
    description: input.notes?.trim() || propertyAddress || undefined,
    contactId,
    status: input.status ?? "new",
    metadata,
    externalRefs: {
      ...(wpId != null ? { [externalKey]: wpId } : {}),
      wp_created_at: input.createdAt,
      wp_synced_at: new Date().toISOString(),
      capture_path: "wp_dual_write",
    },
  });

  return { ok: true, outcome: "created", leadId: lead.id };
}

/**
 * Publish a DigitalGate Property to Domain Listings Management (residential upsert).
 * Property acts as Listing SoT until a first-class Listing model ships.
 */

import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../../audit";
import { domainCredentialsConfigured, ensureValidOrgDomainAccessToken } from "./auth";
import {
  buildDomainResidentialListingBody,
  upsertDomainResidentialListing,
  type DomainListingContact,
} from "./listings";

export type PublishPropertyToDomainInput = {
  organisationId: string;
  propertyId: string;
  actorId?: string;
  /** Optional override; otherwise resolved from org settings / me/agencies / sandbox test agency */
  domainAgencyId?: number;
  contact?: DomainListingContact;
};

export type DomainPlacementRef = {
  channel: "domain";
  status: "pending" | "published" | "error";
  providerAdId: string;
  domainAgencyId: number;
  processId?: string | null;
  processStatus?: string | null;
  providerId?: string | null;
  versionId?: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  path?: string | null;
};

export type PublishPropertyToDomainResult =
  | {
      ok: true;
      status: "pending";
      placement: DomainPlacementRef;
      message: string;
      raw?: unknown;
    }
  | {
      ok: false;
      reason:
        | "not_configured"
        | "not_connected"
        | "not_found"
        | "validation"
        | "upstream_error";
      message: string;
      securityReason?: string | null;
      placement?: DomainPlacementRef;
      raw?: unknown;
    };

async function resolvePublishContact(
  organisationId: string,
  actorId: string | undefined,
  override?: DomainListingContact,
): Promise<DomainListingContact | { ok: false; message: string }> {
  if (override?.email && override.firstName && override.lastName) {
    return override;
  }

  if (actorId) {
    try {
      const {
        getMembershipByClerkUser,
        membershipCardEmail,
      } = await import("../../org/membership-profile");
      const membership = await getMembershipByClerkUser(organisationId, actorId);
      const email = membership ? membershipCardEmail(membership) : null;
      if (membership && email) {
        const parts = (membership.displayName || "").trim().split(/\s+/).filter(Boolean);
        return {
          firstName: parts[0] || "Agent",
          lastName: parts.slice(1).join(" ") || "Contact",
          email,
          phone: membership.phone ?? undefined,
        };
      }
    } catch {
      // fall through
    }
  }

  try {
    const { prisma } = await import("@dg/database");
    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { name: true, settings: true },
    });
    const settings = (org?.settings as Record<string, unknown> | null) ?? {};
    const profile = (settings.profile as Record<string, unknown> | undefined) ?? {};
    const email =
      (typeof profile.email === "string" && profile.email.trim()) ||
      (typeof profile.contactEmail === "string" && profile.contactEmail.trim()) ||
      "";
    if (email) {
      const name =
        (typeof profile.contactName === "string" && profile.contactName.trim()) ||
        org?.name ||
        "Agency Contact";
      const parts = name.split(/\s+/).filter(Boolean);
      return {
        firstName: parts[0] || "Agency",
        lastName: parts.slice(1).join(" ") || "Contact",
        email,
        phone: typeof profile.phone === "string" ? profile.phone : undefined,
      };
    }
  } catch {
    // fall through
  }

  return {
    ok: false,
    message:
      "Domain requires a listing contact (first name, last name, email). Set your membership email or organisation profile contact email, then retry.",
  };
}

export async function publishPropertyToDomain(
  input: PublishPropertyToDomainInput,
): Promise<PublishPropertyToDomainResult> {
  if (!domainCredentialsConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "Domain OAuth not configured — set DOMAIN_CLIENT_ID + DOMAIN_CLIENT_SECRET on Vercel",
    };
  }

  if (!process.env.DATABASE_URL) {
    return { ok: false, reason: "not_found", message: "Database not configured" };
  }

  const token = await ensureValidOrgDomainAccessToken(input.organisationId);
  if (!token.ok) {
    return {
      ok: false,
      reason: "not_connected",
      message: `${token.message}. Connect Domain under Settings → Connectors.`,
    };
  }

  const { prisma } = await import("@dg/database");
  const property = await prisma.property.findFirst({
    where: {
      id: input.propertyId,
      organisationId: input.organisationId,
      deletedAt: null,
    },
  });
  if (!property) {
    return { ok: false, reason: "not_found", message: "Property not found" };
  }

  if (!property.suburb?.trim() || !property.state?.trim() || !property.postcode?.trim()) {
    return {
      ok: false,
      reason: "validation",
      message: "Property needs suburb, state and postcode before Domain publish",
    };
  }

  const contact = await resolvePublishContact(
    input.organisationId,
    input.actorId,
    input.contact,
  );
  if ("ok" in contact && contact.ok === false) {
    return { ok: false, reason: "validation", message: contact.message };
  }

  const providerAdId = `dg-${property.id}`.slice(0, 50);
  const prevRefs = (property.externalRefs as Record<string, unknown> | null) ?? {};
  const prevDomain =
    prevRefs.domain && typeof prevRefs.domain === "object"
      ? (prevRefs.domain as Record<string, unknown>)
      : {};

  const agencyOverride =
    typeof input.domainAgencyId === "number" && Number.isFinite(input.domainAgencyId)
      ? input.domainAgencyId
      : typeof prevDomain.domainAgencyId === "number"
        ? prevDomain.domainAgencyId
        : undefined;

  if (agencyOverride) {
    const { saveOrgDomainConnectorTokens, getOrgDomainConnectorTokens } = await import("./auth");
    const existing = await getOrgDomainConnectorTokens(input.organisationId);
    await saveOrgDomainConnectorTokens(input.organisationId, {
      ...(existing ?? {}),
      domainAgencyId: agencyOverride,
    });
  }

  const body = buildDomainResidentialListingBody({
    domainAgencyId: agencyOverride ?? 0,
    providerAdId,
    property: {
      id: property.id,
      addressLine1: property.addressLine1,
      addressLine2: property.addressLine2,
      suburb: property.suburb,
      state: property.state,
      postcode: property.postcode,
      propertyType: property.propertyType,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      listingPriceCents: property.listingPriceCents,
      status: property.status,
      metadata: property.metadata as Record<string, unknown> | null,
    },
    contacts: [contact as DomainListingContact],
    listingAction: "sale",
  });

  const result = await upsertDomainResidentialListing({
    organisationId: input.organisationId,
    body,
  });

  const now = new Date().toISOString();

  if (!result.ok) {
    const placement: DomainPlacementRef = {
      channel: "domain",
      status: "error",
      providerAdId,
      domainAgencyId:
        typeof prevDomain.domainAgencyId === "number" ? prevDomain.domainAgencyId : 0,
      processId: typeof prevDomain.processId === "string" ? prevDomain.processId : null,
      lastSyncedAt: now,
      lastError: result.message,
      path: result.path ?? null,
    };
    await prisma.property.update({
      where: { id: property.id },
      data: {
        externalRefs: {
          ...prevRefs,
          domain: placement,
        } as Prisma.InputJsonValue,
      },
    });
    return {
      ok: false,
      reason: "upstream_error",
      message: result.message,
      securityReason: result.securityReason,
      placement,
      raw: result.raw,
    };
  }

  const processStatus = result.response.processStatus ?? "queued";
  const placement: DomainPlacementRef = {
    channel: "domain",
    status: "pending",
    providerAdId: result.providerAdId,
    domainAgencyId: result.domainAgencyId,
    processId: result.response.id ?? null,
    processStatus,
    providerId: result.response.providerId ?? null,
    versionId: result.response.versionId ?? null,
    lastSyncedAt: now,
    lastError: null,
    path: result.path,
  };

  await prisma.property.update({
    where: { id: property.id },
    data: {
      externalRefs: {
        ...prevRefs,
        domain: placement,
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Property",
      entityId: property.id,
      activityType: "domain_listing_queued",
      title: "Domain listing queued",
      body: `Process ${result.response.id ?? "unknown"} · agency ${result.domainAgencyId} · ${processStatus}`,
      sourceApp: "real-estate",
      createdBy: input.actorId,
    },
  });

  if (input.actorId) {
    await writeAuditLog({
      organisationId: input.organisationId,
      actorId: input.actorId,
      action: "update",
      entityType: "Property",
      entityId: property.id,
      changes: {
        domainPublish: {
          processId: result.response.id,
          domainAgencyId: result.domainAgencyId,
          providerAdId: result.providerAdId,
          path: result.path,
        },
      },
    }).catch(() => null);
  }

  return {
    ok: true,
    status: "pending",
    placement,
    message: `Domain accepted listing upsert (${processStatus}). Processing is async — poll processingReports or wait for webhook when approved. Job id: ${result.response.id ?? "n/a"}`,
    raw: result.response,
  };
}

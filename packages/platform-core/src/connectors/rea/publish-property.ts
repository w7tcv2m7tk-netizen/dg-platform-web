/**
 * Publish a DigitalGate Property to realestate.com.au (REA Group)
 * via Partner Platform Listing Upload (REAXML).
 *
 * Success = HTTP 202 + uploadId → placement status **pending** (never "published"
 * until a upload report confirms NEW/PROCESSED).
 */

import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../../audit";
import {
  getOrgReaConnectorTokens,
  reaCredentialsConfigured,
  type OrgReaConnectorTokens,
} from "./auth";
import {
  buildReaListingXml,
  fetchReaUploadReport,
  uploadReaListingXml,
  type ReaListingContact,
  type ReaListingXmlStatus,
} from "./listings";

export type PublishPropertyToReaInput = {
  organisationId: string;
  propertyId: string;
  actorId?: string;
  /** Optional override when REA documents agency/office id */
  reaAgencyId?: string;
  contact?: ReaListingContact;
};

export type ReaPlacementRef = {
  channel: "rea";
  /** Never set to "published" on upload accept — only after report confirmation */
  status: "draft" | "pending" | "error";
  providerAdId: string;
  reaAgencyId?: string | null;
  uploadId?: string | null;
  listingId?: string | null;
  progress?: string | null;
  result?: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  path?: string | null;
};

export type PublishPropertyToReaResult =
  | {
      ok: true;
      status: "pending";
      placement: ReaPlacementRef;
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
        | "upstream_error"
        | "not_implemented";
      message: string;
      placement?: ReaPlacementRef;
      raw?: unknown;
    };

async function resolvePublishContact(
  organisationId: string,
  actorId: string | undefined,
  override?: ReaListingContact,
): Promise<ReaListingContact | { ok: false; message: string }> {
  if (override?.name?.trim()) {
    return {
      name: override.name.trim(),
      email: override.email?.trim(),
      telephone: override.telephone?.trim(),
    };
  }

  if (actorId) {
    try {
      const {
        getMembershipByClerkUser,
        membershipCardEmail,
      } = await import("../../org/membership-profile");
      const membership = await getMembershipByClerkUser(organisationId, actorId);
      const email = membership ? membershipCardEmail(membership) : null;
      if (membership && (membership.displayName || email)) {
        return {
          name: (membership.displayName || email || "Listing agent").trim(),
          email: email ?? undefined,
          telephone: membership.phone ?? undefined,
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
    const name =
      (typeof profile.contactName === "string" && profile.contactName.trim()) ||
      (typeof profile.tradingName === "string" && profile.tradingName.trim()) ||
      org?.name ||
      "";
    if (name || email) {
      return {
        name: name || email || "Listing agent",
        email: email || undefined,
        telephone: typeof profile.phone === "string" ? profile.phone : undefined,
      };
    }
  } catch {
    // fall through
  }

  return {
    ok: false,
    message:
      "REA requires a listing agent name (and ideally email). Set your membership display name/email or organisation profile contact, then retry.",
  };
}

export async function publishPropertyToRea(
  input: PublishPropertyToReaInput,
): Promise<PublishPropertyToReaResult> {
  if (!reaCredentialsConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "REA Partner credentials not configured — set REA_CLIENT_ID + REA_CLIENT_SECRET on Vercel",
    };
  }

  if (!process.env.DATABASE_URL) {
    return { ok: false, reason: "not_found", message: "Database not configured" };
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
      message: "Property needs suburb, state and postcode before REA publish",
    };
  }
  if (!property.addressLine1?.trim()) {
    return {
      ok: false,
      reason: "validation",
      message: "Property needs address line 1 before REA publish",
    };
  }

  const tokens = await getOrgReaConnectorTokens(input.organisationId);
  const reaAgencyId =
    input.reaAgencyId?.trim() ||
    tokens?.reaAgencyId?.trim() ||
    "";
  if (!reaAgencyId) {
    return {
      ok: false,
      reason: "not_connected",
      message:
        "REA agency not activated for this organisation. Bind agency id under Settings → Connectors after Ignite / Change of Uploader.",
    };
  }

  if (input.reaAgencyId?.trim() && input.reaAgencyId.trim() !== tokens?.reaAgencyId) {
    const next: OrgReaConnectorTokens = {
      ...(tokens ?? {}),
      reaAgencyId: input.reaAgencyId.trim(),
    };
    const { saveOrgReaConnectorTokens } = await import("./auth");
    await saveOrgReaConnectorTokens(input.organisationId, next);
  }

  const contact = await resolvePublishContact(
    input.organisationId,
    input.actorId,
    input.contact,
  );
  if ("ok" in contact && contact.ok === false) {
    return { ok: false, reason: "validation", message: contact.message };
  }

  const providerAdId = `dg-${property.id}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 50);
  const prevRefs = (property.externalRefs as Record<string, unknown> | null) ?? {};
  const prevRea =
    prevRefs.rea && typeof prevRefs.rea === "object"
      ? (prevRefs.rea as Record<string, unknown>)
      : {};

  const listingStatus = ((): ReaListingXmlStatus | undefined => {
    const s = (property.status ?? "").toLowerCase();
    if (s === "withdrawn") return "withdrawn";
    if (s === "sold") return "sold";
    return "current";
  })();

  const built = buildReaListingXml({
    reaAgencyId,
    uniqueId: providerAdId,
    property: {
      id: property.id,
      addressLine1: property.addressLine1,
      addressLine2: property.addressLine2,
      suburb: property.suburb,
      state: property.state,
      postcode: property.postcode,
      country: property.country,
      propertyType: property.propertyType,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      listingPriceCents: property.listingPriceCents,
      status: property.status,
      metadata: property.metadata as Record<string, unknown> | null,
      updatedAt: property.updatedAt,
    },
    contact: contact as ReaListingContact,
    status: listingStatus,
  });

  if (!built.ok) {
    return {
      ok: false,
      reason: "validation",
      message: `REAXML validation failed: ${built.errors.join("; ")}`,
    };
  }

  const upload = await uploadReaListingXml({
    organisationId: input.organisationId,
    xml: built.xml,
  });

  const now = new Date().toISOString();

  if (!upload.ok) {
    const placement: ReaPlacementRef = {
      channel: "rea",
      status: "error",
      providerAdId,
      reaAgencyId,
      uploadId: typeof prevRea.uploadId === "string" ? prevRea.uploadId : null,
      listingId: typeof prevRea.listingId === "string" ? prevRea.listingId : null,
      lastSyncedAt: now,
      lastError: upload.message,
      path: upload.path ?? null,
    };
    await prisma.property.update({
      where: { id: property.id },
      data: {
        externalRefs: {
          ...prevRefs,
          rea: placement,
        } as Prisma.InputJsonValue,
      },
    });
    return {
      ok: false,
      reason: "upstream_error",
      message: upload.message,
      placement,
      raw: upload.raw,
    };
  }

  let progress: string | null = null;
  let result: string | null = null;
  let listingId: string | null = null;
  let reportRaw: unknown = upload.raw;

  // Best-effort one-shot poll — still never claim "published" here.
  const report = await fetchReaUploadReport({
    organisationId: input.organisationId,
    uploadId: upload.uploadId,
  });
  if (report.ok) {
    reportRaw = report.raw;
    progress =
      typeof report.report.progress === "string" ? report.report.progress : null;
    result = typeof report.report.result === "string" ? report.report.result : null;
    listingId =
      report.report.listingId != null ? String(report.report.listingId) : null;
  }

  const placement: ReaPlacementRef = {
    channel: "rea",
    status: "pending",
    providerAdId,
    reaAgencyId,
    uploadId: upload.uploadId,
    listingId,
    progress,
    result,
    lastSyncedAt: now,
    lastError: null,
    path: upload.path,
  };

  await prisma.property.update({
    where: { id: property.id },
    data: {
      externalRefs: {
        ...prevRefs,
        rea: placement,
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Property",
      entityId: property.id,
      activityType: "rea_listing_queued",
      title: "REA listing queued",
      body: `Upload ${upload.uploadId} · agency ${reaAgencyId}${result ? ` · ${result}` : ""}${progress ? ` · ${progress}` : ""}`,
      sourceApp: "real-estate",
      createdBy: input.actorId,
    },
  });

  try {
    await writeAuditLog({
      organisationId: input.organisationId,
      actorId: input.actorId,
      action: "update",
      entityType: "Property",
      entityId: property.id,
      changes: {
        channel: "rea",
        uploadId: upload.uploadId,
        reaAgencyId,
        providerAdId,
        progress,
        result,
      },
    });
  } catch {
    // non-fatal
  }

  return {
    ok: true,
    status: "pending",
    placement,
    message: report.ok
      ? `REA upload accepted (${upload.uploadId})${progress ? ` · ${progress}` : ""}${result ? ` · ${result}` : ""} — status stays pending until live confirmation`
      : `REA upload accepted (${upload.uploadId}) — polling report later; status pending (not published)`,
    raw: reportRaw,
  };
}

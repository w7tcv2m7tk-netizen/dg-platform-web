import { createContact } from "../contacts";
import { createOpportunity } from "../opportunities";
import {
  buildWantTitle,
  formatWantBudget,
  WANT_RECORD_KIND,
  WANTD_VERTICAL,
  type CapturePropertyWantInput,
  type CapturePropertyWantResult,
  type WantOpportunityMetadata,
  type WantTimeline,
  type WantTransaction,
} from "./types";

function nameParts(name: string): { firstName: string; lastName?: string } {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] || "Unknown",
    lastName: parts.slice(1).join(" ") || undefined,
  };
}

function parseAudToCents(aud?: number): number | undefined {
  if (aud == null || !Number.isFinite(aud) || aud < 0) return undefined;
  return Math.round(aud * 100);
}

/**
 * MVP demand capture: Contact + CRM Opportunity (Want metadata).
 * Matching stays manual; automation hooks via opportunity.created.
 */
export async function capturePropertyWant(
  input: CapturePropertyWantInput,
): Promise<CapturePropertyWantResult> {
  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      code: "database_not_configured",
      message: "DATABASE_URL not set",
    };
  }

  const name = input.buyer.name?.trim();
  if (!name) {
    return { ok: false, code: "validation_error", message: "name is required" };
  }
  const email = input.buyer.email?.trim().toLowerCase() || undefined;
  const phone = input.buyer.phone?.trim() || undefined;
  if (!email && !phone) {
    return {
      ok: false,
      code: "validation_error",
      message: "email or phone is required",
    };
  }

  const transaction: WantTransaction = input.transaction ?? "buy";
  const timeline: WantTimeline = input.timeline ?? "1_3_months";
  const property = input.property ?? {};
  const requirements = input.requirements ?? {};

  const { prisma } = await import("@dg/database");

  let contactId: string | undefined;
  let createdContact = false;

  if (email) {
    const existing = await prisma.contact.findFirst({
      where: {
        organisationId: input.organisationId,
        email,
        deletedAt: null,
      },
    });
    contactId = existing?.id;
  }

  if (!contactId) {
    const parts = nameParts(name);
    const contact = await createContact({
      organisationId: input.organisationId,
      actorId: input.actorId,
      firstName: parts.firstName,
      lastName: parts.lastName,
      email,
      phone,
      source: input.source ?? "wantd_property_form",
      tags: "wantd,want,property",
    });
    contactId = contact.id;
    createdContact = true;
  }

  const metadata: WantOpportunityMetadata = {
    record_kind: WANT_RECORD_KIND,
    category: "property",
    vertical: WANTD_VERTICAL,
    transaction,
    property,
    requirements,
    timeline,
    demand_object_ready: false,
    source: input.source ?? "wantd_property_form",
    capture_path: "wantd_property_want",
  };

  const title = buildWantTitle({ buyerName: name, transaction, property });
  const valueCents =
    parseAudToCents(property.maxBudgetAud) ??
    parseAudToCents(property.minBudgetAud);

  const opportunity = await createOpportunity({
    organisationId: input.organisationId,
    actorId: input.actorId,
    title,
    stage: "new",
    status: "open",
    contactId,
    valueCents,
    currency: "AUD",
    pipelineId: "wantd_property_want",
    metadata,
  });

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Opportunity",
      entityId: opportunity.id,
      activityType: "want_captured",
      title: "Property Want captured",
      body: [
        formatWantBudget(property),
        property.propertyType,
        property.preferredSuburbs?.join(", "),
        requirements.description,
      ]
        .filter(Boolean)
        .join(" · "),
      sourceApp: "wantd",
      createdBy: input.actorId,
      metadata: {
        record_kind: WANT_RECORD_KIND,
        contactId,
      },
    },
  });

  return {
    ok: true,
    contactId,
    opportunityId: opportunity.id,
    createdContact,
  };
}

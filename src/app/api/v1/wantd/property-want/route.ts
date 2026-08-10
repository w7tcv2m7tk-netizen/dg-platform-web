import {
  capturePropertyWant,
  resolveWantdOrganisationId,
  WANT_TIMELINES,
  WANT_TRANSACTIONS,
  type WantTimeline,
  type WantTransaction,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

function parseList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

function parseAud(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function parseIntOpt(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

/** Public Wantd Property demand capture → Contact + Want Opportunity. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  const organisationId = await resolveWantdOrganisationId();
  if (!organisationId) {
    return NextResponse.json(
      {
        error: {
          code: "org_not_ready",
          message: "Wantd organisation is not provisioned yet",
        },
      },
      { status: 503 },
    );
  }

  const transactionRaw = String(body.transaction ?? "buy").toLowerCase();
  const transaction = (WANT_TRANSACTIONS as readonly string[]).includes(transactionRaw)
    ? (transactionRaw as WantTransaction)
    : "buy";

  const timelineRaw = String(body.timeline ?? "1_3_months").toLowerCase();
  const timeline = (WANT_TIMELINES as readonly string[]).includes(timelineRaw)
    ? (timelineRaw as WantTimeline)
    : "1_3_months";

  const result = await capturePropertyWant({
    organisationId,
    buyer: {
      name: String(body.name ?? body.buyerName ?? ""),
      email: body.email ? String(body.email) : undefined,
      phone: body.phone ? String(body.phone) : undefined,
    },
    transaction,
    timeline,
    property: {
      propertyType: body.propertyType ? String(body.propertyType) : undefined,
      preferredSuburbs: parseList(body.preferredSuburbs ?? body.suburbs),
      preferredRegions: parseList(body.preferredRegions ?? body.regions),
      minBudgetAud: parseAud(body.minBudgetAud ?? body.minBudget),
      maxBudgetAud: parseAud(body.maxBudgetAud ?? body.maxBudget),
      bedrooms: parseIntOpt(body.bedrooms),
      bathrooms: parseIntOpt(body.bathrooms),
      minLandSizeSqm: parseIntOpt(body.minLandSizeSqm ?? body.minLandSize),
    },
    requirements: {
      mustHaves: body.mustHaves ? String(body.mustHaves) : undefined,
      lifestyle: body.lifestyle ? String(body.lifestyle) : undefined,
      description:
        body.description != null || body.message != null
          ? String(body.description ?? body.message)
          : undefined,
    },
    source: body.source ? String(body.source) : "wantd_property_form",
  });

  if (!result.ok) {
    const status = result.code === "validation_error" ? 422 : 500;
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status },
    );
  }

  return NextResponse.json(
    {
      data: {
        contactId: result.contactId,
        opportunityId: result.opportunityId,
        createdContact: result.createdContact,
      },
    },
    { status: 201 },
  );
}

/**
 * Domain Listings Management — residential upsert + sandbox agency helpers.
 *
 * @see docs/foundations/PROPERTY-SYNDICATION.md
 */

import {
  domainApiGet,
  domainApiPost,
  domainApiPut,
  ensureValidOrgDomainAccessToken,
  getDomainOAuthConfig,
  getOrgDomainConnectorTokens,
  saveOrgDomainConnectorTokens,
  type DomainApiFailure,
  type DomainApiSuccess,
} from "./auth";

export const DOMAIN_RESIDENTIAL_LISTING_PATH = "/v1/listings/residential";
export const DOMAIN_TEST_AGENCY_PATH = "/v1/agencies/_testAgency";
export const DOMAIN_PROCESSING_REPORT_PATH = "/v1/listings/processingReports";

export type DomainListingContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  domainAgentId?: number;
  receiveEmails?: boolean;
};

export type DomainListingUpsertResponse = {
  processStatus?: string;
  id?: string;
  agencyId?: number;
  providerId?: string;
  providerAdId?: string;
  versionId?: string;
};

export type DomainPropertyLike = {
  id: string;
  addressLine1: string;
  addressLine2?: string | null;
  suburb: string;
  state: string;
  postcode: string;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  listingPriceCents?: number | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

const PROPERTY_TYPE_MAP: Record<string, string> = {
  house: "house",
  home: "house",
  apartment: "apartmentUnitFlat",
  unit: "apartmentUnitFlat",
  flat: "apartmentUnitFlat",
  apartmentunitflat: "apartmentUnitFlat",
  townhouse: "townhouse",
  villa: "villa",
  terrace: "terrace",
  duplex: "duplex",
  studio: "studio",
  land: "vacantLand",
  vacantland: "vacantLand",
  "vacant land": "vacantLand",
  rural: "rural",
  farm: "farm",
  penthouse: "penthouse",
  retirement: "retirement",
};

function mapPropertyType(raw?: string | null): string {
  if (!raw?.trim()) return "house";
  const key = raw.trim().toLowerCase().replace(/[_\s-]+/g, "");
  const spaced = raw.trim().toLowerCase();
  return PROPERTY_TYPE_MAP[key] || PROPERTY_TYPE_MAP[spaced] || "house";
}

function normaliseState(state: string): string {
  return state.trim().toLowerCase();
}

/** Split "55 Pyrmont Street" / "Unit 2/55 Pyrmont Street" into Domain address parts. */
export function splitStreetAddress(addressLine1: string): {
  unitNumber?: string;
  streetNumber?: string;
  street: string;
} {
  const raw = addressLine1.trim();
  if (!raw) return { street: "Unknown" };

  const unitMatch = raw.match(/^(?:unit|apt|apartment|suite)\s*([A-Za-z0-9\-]+)\s*[\/,]?\s*(.+)$/i);
  let unitNumber: string | undefined;
  let rest = raw;
  if (unitMatch) {
    unitNumber = unitMatch[1];
    rest = unitMatch[2].trim();
  } else {
    const slashUnit = raw.match(/^([A-Za-z0-9\-]+)\s*\/\s*(.+)$/);
    if (slashUnit && /^\d/.test(slashUnit[2])) {
      unitNumber = slashUnit[1];
      rest = slashUnit[2].trim();
    }
  }

  const numbered = rest.match(/^(\d+[A-Za-z]?)\s+(.+)$/);
  if (numbered) {
    return { unitNumber, streetNumber: numbered[1], street: numbered[2].trim() };
  }
  return { unitNumber, street: rest };
}

export function buildDomainResidentialListingBody(input: {
  domainAgencyId: number;
  providerAdId: string;
  property: DomainPropertyLike;
  contacts: DomainListingContact[];
  listingAction?: "sale" | "rent";
}): Record<string, unknown> {
  const marketing =
    (input.property.metadata?.marketing as Record<string, unknown> | undefined) ?? {};
  const summary =
    (typeof marketing.headline === "string" && marketing.headline.trim()) ||
    `${input.property.addressLine1}, ${input.property.suburb}`;
  const description =
    (typeof marketing.description === "string" && marketing.description.trim()) ||
    summary;
  const features =
    typeof marketing.features === "string"
      ? marketing.features
      : Array.isArray(marketing.features)
        ? marketing.features.map(String).join(", ")
        : undefined;

  const images = Array.isArray(input.property.metadata?.images)
    ? (input.property.metadata!.images as unknown[])
        .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
        .slice(0, 30)
        .map((url) => ({ resourceType: "photograph", url }))
    : [];

  const carSpaces =
    typeof input.property.metadata?.car_spaces === "number"
      ? input.property.metadata.car_spaces
      : undefined;

  const { unitNumber, streetNumber, street } = splitStreetAddress(input.property.addressLine1);
  const priceDollars =
    typeof input.property.listingPriceCents === "number" && input.property.listingPriceCents > 0
      ? Math.round(input.property.listingPriceCents / 100)
      : undefined;

  const body: Record<string, unknown> = {
    domainAgencyID: input.domainAgencyId,
    providerAdId: input.providerAdId.slice(0, 50),
    listingAction: input.listingAction ?? "sale",
    underOfferOrContract: input.property.status === "under_offer",
    summary: summary.slice(0, 250),
    description: description.slice(0, 6000),
    contacts: input.contacts.map((c) => ({
      firstName: c.firstName.slice(0, 50),
      lastName: c.lastName.slice(0, 50),
      email: c.email.slice(0, 100),
      ...(c.phone ? { phone: c.phone.slice(0, 20) } : {}),
      ...(c.mobile ? { mobile: c.mobile.slice(0, 20) } : {}),
      ...(typeof c.domainAgentId === "number" ? { domainAgentId: c.domainAgentId } : {}),
      receiveEmails: c.receiveEmails !== false,
    })),
    propertyDetails: {
      propertyType: [mapPropertyType(input.property.propertyType)],
      ...(typeof input.property.bedrooms === "number" ? { bedRooms: input.property.bedrooms } : {}),
      ...(typeof input.property.bathrooms === "number"
        ? { bathRooms: Math.round(input.property.bathrooms) }
        : {}),
      ...(typeof carSpaces === "number"
        ? { parkingInfo: { details: [{ parkingType: "onSite", numberOfSpaces: carSpaces }] } }
        : {}),
      ...(images.length ? { images } : {}),
      address: {
        displayOption: "fullAddress",
        state: normaliseState(input.property.state),
        suburb: input.property.suburb,
        postcode: input.property.postcode,
        street,
        ...(streetNumber ? { streetNumber } : {}),
        ...(unitNumber ? { unitNumber } : {}),
      },
    },
  };

  if (features?.trim()) {
    body.features = features.slice(0, 1000);
  }
  if (priceDollars) {
    body.price = {
      from: priceDollars,
      to: priceDollars,
      displayText: `$${priceDollars.toLocaleString("en-AU")}`,
    };
  }

  const inspectionTimes =
    typeof input.property.metadata?.inspection_times === "string"
      ? input.property.metadata.inspection_times.trim()
      : "";
  if (inspectionTimes) {
    body.inspectionDetails = { inspectionDescription: inspectionTimes.slice(0, 500) };
  }

  return body;
}

function extractAgencyId(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const id = (data as { id?: unknown }).id;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
  return null;
}

function parseAgencyList(data: unknown): Array<{ id: number; name?: string }> {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { agencies?: unknown }).agencies)
      ? (data as { agencies: unknown[] }).agencies
      : [];
  const out: Array<{ id: number; name?: string }> = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const id =
      typeof (row as { id?: unknown }).id === "number"
        ? (row as { id: number }).id
        : typeof (row as { id?: unknown }).id === "string" &&
            /^\d+$/.test(String((row as { id: unknown }).id))
          ? Number((row as { id: string }).id)
          : NaN;
    if (!Number.isFinite(id)) continue;
    out.push({
      id,
      name: typeof (row as { name?: unknown }).name === "string" ? (row as { name: string }).name : undefined,
    });
  }
  return out;
}

/**
 * Resolve Domain agency id for publish:
 * 1) stored org preference
 * 2) GET /v1/me/agencies
 * 3) sandbox only: POST /v1/agencies/_testAgency
 */
export async function resolveOrgDomainAgencyId(
  organisationId: string,
  accessToken: string,
): Promise<
  | { ok: true; domainAgencyId: number; source: "stored" | "me_agencies" | "test_agency" }
  | { ok: false; message: string; securityReason?: string | null; raw?: unknown }
> {
  const tokens = await getOrgDomainConnectorTokens(organisationId);
  if (tokens?.domainAgencyId && Number.isFinite(tokens.domainAgencyId)) {
    return { ok: true, domainAgencyId: tokens.domainAgencyId, source: "stored" };
  }

  const agencies = await domainApiGet("/v1/me/agencies", accessToken);
  if (agencies.ok) {
    const list = parseAgencyList(agencies.data);
    if (list[0]) {
      await saveOrgDomainConnectorTokens(organisationId, {
        ...(tokens ?? {}),
        domainAgencyId: list[0].id,
        lastError: undefined,
      });
      return { ok: true, domainAgencyId: list[0].id, source: "me_agencies" };
    }
  }

  const cfg = getDomainOAuthConfig();
  const sandbox = Boolean(cfg.ok && cfg.config.apiPathPrefix.includes("sandbox"));
  if (!sandbox) {
    return {
      ok: false,
      message: agencies.ok
        ? "No Domain agencies on this account. For production, complete agency authorisation with Domain (api@domain.com.au)."
        : `Could not list Domain agencies (${agencies.path}): ${agencies.message}. Set DOMAIN_API_PATH_PREFIX=/sandbox for sandbox, or authorise an agency.`,
      securityReason: agencies.ok ? null : agencies.securityReason,
      raw: agencies.ok ? agencies.data : agencies.raw,
    };
  }

  const created = await domainApiPost(DOMAIN_TEST_AGENCY_PATH, accessToken);
  if (!created.ok) {
    return {
      ok: false,
      message: `Sandbox test agency create failed (${created.path}): ${created.message}. Ensure Listings Management — Sandbox is on the project and api_agencies_write is consented.`,
      securityReason: created.securityReason,
      raw: created.raw,
    };
  }

  const id = extractAgencyId(created.data);
  if (!id) {
    return {
      ok: false,
      message: "Sandbox test agency created but response had no id — check Domain response and retry",
      raw: created.data,
    };
  }

  await saveOrgDomainConnectorTokens(organisationId, {
    ...(tokens ?? {}),
    domainAgencyId: id,
    lastError: undefined,
  });
  return { ok: true, domainAgencyId: id, source: "test_agency" };
}

export async function upsertDomainResidentialListing(input: {
  organisationId: string;
  body: Record<string, unknown>;
}): Promise<
  | {
      ok: true;
      response: DomainListingUpsertResponse;
      path: string;
      httpStatus: number;
      domainAgencyId: number;
      providerAdId: string;
    }
  | {
      ok: false;
      message: string;
      status?: number;
      securityReason?: string | null;
      path?: string;
      raw?: unknown;
    }
> {
  const ensured = await ensureValidOrgDomainAccessToken(input.organisationId);
  if (!ensured.ok) {
    return { ok: false, message: ensured.message };
  }

  const agency = await resolveOrgDomainAgencyId(input.organisationId, ensured.accessToken);
  if (!agency.ok) {
    return {
      ok: false,
      message: agency.message,
      securityReason: agency.securityReason,
      raw: agency.raw,
    };
  }

  const body: Record<string, unknown> = {
    ...input.body,
    domainAgencyID: agency.domainAgencyId,
  };
  const providerAdId =
    typeof body.providerAdId === "string" && body.providerAdId.trim()
      ? body.providerAdId.trim().slice(0, 50)
      : "";
  if (!providerAdId) {
    return { ok: false, message: "providerAdId is required for Domain listing upsert" };
  }
  body.providerAdId = providerAdId;

  const put = await domainApiPut(DOMAIN_RESIDENTIAL_LISTING_PATH, ensured.accessToken, body);
  if (!put.ok) {
    return {
      ok: false,
      status: put.status,
      path: put.path,
      securityReason: put.securityReason,
      raw: put.raw,
      message: put.message,
    };
  }

  const response = (put.data ?? {}) as DomainListingUpsertResponse;
  return {
    ok: true,
    response,
    path: put.path,
    httpStatus: put.status,
    domainAgencyId: agency.domainAgencyId,
    providerAdId,
  };
}

export async function fetchDomainProcessingReport(input: {
  organisationId: string;
  processId: string;
}): Promise<DomainApiSuccess | DomainApiFailure | { ok: false; message: string }> {
  const ensured = await ensureValidOrgDomainAccessToken(input.organisationId);
  if (!ensured.ok) return { ok: false, message: ensured.message };
  const id = encodeURIComponent(input.processId);
  return domainApiGet(`${DOMAIN_PROCESSING_REPORT_PATH}/${id}`, ensured.accessToken);
}

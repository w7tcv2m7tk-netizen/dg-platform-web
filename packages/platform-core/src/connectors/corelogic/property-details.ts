/**
 * Cotality Property Details — pull attributes for a matched propertyId.
 *
 * Sandbox host: https://api-sbox.corelogic.asia/property-details
 * Paths (Postman Sample Sandbox Collection):
 *   GET /au/properties/{id}/attributes/core
 *   GET /au/properties/{id}/attributes/additional
 *   GET /au/properties/{id}/site
 *   GET /au/properties/{id}/sales/last
 *   GET /au/properties/{id}/features
 *
 * Optional AVM (separate host): GET /au/properties/{id}/avm/intellival/consumer/current
 * Never invent valuations — persist unavailable / error honestly.
 *
 * @see docs/connectors/COTALITY-CORELOGIC.md
 */

import {
  coreLogicApiGet,
  ensureCoreLogicAccessToken,
  getCoreLogicOAuthConfig,
} from "./auth";

export type CoreLogicSectionStatus = "ok" | "empty" | "unavailable" | "error";

export type CoreLogicCoreAttributes = {
  isActiveProperty?: boolean;
  propertyType?: string;
  propertySubType?: string;
  beds?: number;
  baths?: number;
  carSpaces?: number;
  lockUpGarages?: number;
  landArea?: number;
  isCalculatedLandArea?: boolean;
  landAreaSource?: string;
};

export type CoreLogicAdditionalAttributes = {
  isActiveProperty?: boolean;
  floorArea?: number;
  yearBuilt?: string | number;
};

export type CoreLogicSiteDetails = {
  landUsePrimary?: string;
  zoneCodeLocal?: string;
  zoneDescriptionLocal?: string;
  isActiveProperty?: boolean;
};

export type CoreLogicLastSale = {
  contractDate?: string;
  settlementDate?: string;
  price?: number;
  type?: string;
  isPriceWithheld?: boolean;
  isAgentsAdvice?: boolean;
  transferId?: number | string;
};

export type CoreLogicFeatureAttribute = {
  name: string;
  value: string;
  type?: string;
};

export type CoreLogicAvmSnapshot =
  | {
      available: true;
      estimate?: number;
      lowEstimate?: number;
      highEstimate?: number;
      confidence?: string | number;
      valuationDate?: string;
      rawKeys: string[];
    }
  | {
      available: false;
      reason: "unavailable" | "error" | "not_attempted";
      message?: string;
      status?: number;
    };

export type CoreLogicPropertyDetailsSnapshot = {
  propertyId: string | number;
  fetchedAt: string;
  source: "property_details";
  core?: CoreLogicCoreAttributes;
  additional?: CoreLogicAdditionalAttributes;
  site?: CoreLogicSiteDetails;
  lastSale?: CoreLogicLastSale | null;
  features?: string[];
  featureAttributes?: CoreLogicFeatureAttribute[];
  avm: CoreLogicAvmSnapshot;
  sections: {
    core: CoreLogicSectionStatus;
    additional: CoreLogicSectionStatus;
    site: CoreLogicSectionStatus;
    lastSale: CoreLogicSectionStatus;
    features: CoreLogicSectionStatus;
    avm: CoreLogicSectionStatus;
  };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

function pickNumber(
  obj: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return undefined;
}

function pickBoolean(
  obj: Record<string, unknown>,
  keys: string[],
): boolean | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "boolean") return v;
  }
  return undefined;
}

function sectionFromResult(
  res:
    | { ok: true; status: number; data: unknown }
    | { ok: false; status: number; message: string; data?: unknown },
): {
  status: CoreLogicSectionStatus;
  data: Record<string, unknown> | null;
  message?: string;
} {
  if (!res.ok) {
    if (res.status === 404 || res.status === 403 || res.status === 501) {
      return { status: "unavailable", data: null, message: res.message };
    }
    return { status: "error", data: null, message: res.message };
  }
  const data = asRecord(res.data);
  if (!data || Object.keys(data).length === 0) {
    return { status: "empty", data: null };
  }
  return { status: "ok", data };
}

export function parseCoreLogicCoreAttributes(
  data: unknown,
): CoreLogicCoreAttributes | undefined {
  const root = asRecord(data);
  if (!root) return undefined;
  const out: CoreLogicCoreAttributes = {};
  const isActive = pickBoolean(root, ["isActiveProperty"]);
  if (isActive != null) out.isActiveProperty = isActive;
  const propertyType = pickString(root, ["propertyType"]);
  if (propertyType) out.propertyType = propertyType;
  const propertySubType = pickString(root, ["propertySubType"]);
  if (propertySubType) out.propertySubType = propertySubType;
  const beds = pickNumber(root, ["beds", "bedrooms"]);
  if (beds != null) out.beds = beds;
  const baths = pickNumber(root, ["baths", "bathrooms"]);
  if (baths != null) out.baths = baths;
  const carSpaces = pickNumber(root, ["carSpaces", "carspaces"]);
  if (carSpaces != null) out.carSpaces = carSpaces;
  const lockUpGarages = pickNumber(root, ["lockUpGarages"]);
  if (lockUpGarages != null) out.lockUpGarages = lockUpGarages;
  const landArea = pickNumber(root, ["landArea"]);
  if (landArea != null) out.landArea = landArea;
  const isCalculatedLandArea = pickBoolean(root, ["isCalculatedLandArea"]);
  if (isCalculatedLandArea != null) out.isCalculatedLandArea = isCalculatedLandArea;
  const landAreaSource = pickString(root, ["landAreaSource"]);
  if (landAreaSource) out.landAreaSource = landAreaSource;
  return Object.keys(out).length ? out : undefined;
}

export function parseCoreLogicAdditionalAttributes(
  data: unknown,
): CoreLogicAdditionalAttributes | undefined {
  const root = asRecord(data);
  if (!root) return undefined;
  const out: CoreLogicAdditionalAttributes = {};
  const isActive = pickBoolean(root, ["isActiveProperty"]);
  if (isActive != null) out.isActiveProperty = isActive;
  const floorArea = pickNumber(root, ["floorArea"]);
  if (floorArea != null) out.floorArea = floorArea;
  const yearBuilt = root.yearBuilt;
  if (typeof yearBuilt === "string" || typeof yearBuilt === "number") {
    out.yearBuilt = yearBuilt;
  }
  return Object.keys(out).length ? out : undefined;
}

export function parseCoreLogicSiteDetails(
  data: unknown,
): CoreLogicSiteDetails | undefined {
  const root = asRecord(data);
  if (!root) return undefined;
  const out: CoreLogicSiteDetails = {};
  const landUsePrimary = pickString(root, ["landUsePrimary"]);
  if (landUsePrimary) out.landUsePrimary = landUsePrimary;
  const zoneCodeLocal = pickString(root, ["zoneCodeLocal"]);
  if (zoneCodeLocal) out.zoneCodeLocal = zoneCodeLocal;
  const zoneDescriptionLocal = pickString(root, ["zoneDescriptionLocal"]);
  if (zoneDescriptionLocal) out.zoneDescriptionLocal = zoneDescriptionLocal;
  const isActive = pickBoolean(root, ["isActiveProperty"]);
  if (isActive != null) out.isActiveProperty = isActive;
  return Object.keys(out).length ? out : undefined;
}

export function parseCoreLogicLastSale(
  data: unknown,
): CoreLogicLastSale | null | undefined {
  const root = asRecord(data);
  if (!root) return undefined;
  const sale = asRecord(root.lastSale) || root;
  if (!sale || (!sale.price && !sale.contractDate && !sale.settlementDate)) {
    return null;
  }
  const out: CoreLogicLastSale = {};
  const contractDate = pickString(sale, ["contractDate"]);
  if (contractDate) out.contractDate = contractDate;
  const settlementDate = pickString(sale, ["settlementDate"]);
  if (settlementDate) out.settlementDate = settlementDate;
  const price = pickNumber(sale, ["price"]);
  if (price != null) out.price = price;
  const type = pickString(sale, ["type"]);
  if (type) out.type = type;
  const isPriceWithheld = pickBoolean(sale, ["isPriceWithheld"]);
  if (isPriceWithheld != null) out.isPriceWithheld = isPriceWithheld;
  const isAgentsAdvice = pickBoolean(sale, ["isAgentsAdvice"]);
  if (isAgentsAdvice != null) out.isAgentsAdvice = isAgentsAdvice;
  const transferId = sale.transferId;
  if (typeof transferId === "number" || typeof transferId === "string") {
    out.transferId = transferId;
  }
  return Object.keys(out).length ? out : null;
}

export function parseCoreLogicFeatures(data: unknown): {
  features?: string[];
  featureAttributes?: CoreLogicFeatureAttribute[];
} {
  const root = asRecord(data);
  if (!root) return {};
  const features = Array.isArray(root.features)
    ? root.features.filter((f): f is string => typeof f === "string" && f.trim() !== "")
    : undefined;
  const featureAttributes = Array.isArray(root.featureAttributes)
    ? (root.featureAttributes
        .map((row): CoreLogicFeatureAttribute | null => {
          const rec = asRecord(row);
          if (!rec) return null;
          const name = pickString(rec, ["name"]);
          const value = pickString(rec, ["value"]);
          if (!name || value == null) return null;
          const type = pickString(rec, ["type"]);
          return type ? { name, value, type } : { name, value };
        })
        .filter((x): x is CoreLogicFeatureAttribute => x != null))
    : undefined;
  return {
    ...(features?.length ? { features } : {}),
    ...(featureAttributes?.length ? { featureAttributes } : {}),
  };
}

export function parseCoreLogicAvmResponse(
  res:
    | { ok: true; status: number; data: unknown }
    | { ok: false; status: number; message: string; data?: unknown },
): { snapshot: CoreLogicAvmSnapshot; status: CoreLogicSectionStatus } {
  if (!res.ok) {
    const errBody = asRecord(res.data);
    const errors = Array.isArray(errBody?.errors) ? errBody?.errors : null;
    const first = errors && asRecord(errors[0]);
    const msg =
      (first && pickString(first, ["msg", "message"])) ||
      res.message ||
      `AVM HTTP ${res.status}`;
    const unavailable =
      res.status === 404 ||
      res.status === 403 ||
      /not available|out of scope|insufficient/i.test(msg);
    return {
      status: unavailable ? "unavailable" : "error",
      snapshot: {
        available: false,
        reason: unavailable ? "unavailable" : "error",
        message: msg,
        status: res.status,
      },
    };
  }

  const root = asRecord(res.data);
  if (!root) {
    return {
      status: "empty",
      snapshot: {
        available: false,
        reason: "unavailable",
        message: "AVM response empty",
      },
    };
  }

  const estimate = pickNumber(root, [
    "estimate",
    "estimatedValue",
    "valuation",
    "mid",
    "value",
  ]);
  const lowEstimate = pickNumber(root, ["lowEstimate", "low", "lowerEstimate"]);
  const highEstimate = pickNumber(root, [
    "highEstimate",
    "high",
    "upperEstimate",
  ]);
  const confidence = root.confidence ?? root.fsd ?? root.confidenceLevel;
  const valuationDate = pickString(root, [
    "valuationDate",
    "asAtDate",
    "date",
  ]);

  if (estimate == null && lowEstimate == null && highEstimate == null) {
    return {
      status: "empty",
      snapshot: {
        available: false,
        reason: "unavailable",
        message: "AVM payload had no estimate fields",
      },
    };
  }

  return {
    status: "ok",
    snapshot: {
      available: true,
      ...(estimate != null ? { estimate } : {}),
      ...(lowEstimate != null ? { lowEstimate } : {}),
      ...(highEstimate != null ? { highEstimate } : {}),
      ...(typeof confidence === "string" || typeof confidence === "number"
        ? { confidence }
        : {}),
      ...(valuationDate ? { valuationDate } : {}),
      rawKeys: Object.keys(root).slice(0, 40),
    },
  };
}

async function fetchSection(
  propertyId: string | number,
  pathSuffix: string,
  accessToken: string,
) {
  return coreLogicApiGet(
    `/au/properties/${encodeURIComponent(String(propertyId))}${pathSuffix}`,
    accessToken,
    { base: "propertyDetails" },
  );
}

/**
 * Pull Property Details (+ optional AVM) for a Cotality property id.
 * Returns a persistable snapshot — only fields Cotality actually returned.
 */
export async function fetchCoreLogicPropertyDetails(
  propertyId: string | number,
  options?: { includeAvm?: boolean },
): Promise<
  | { ok: true; snapshot: CoreLogicPropertyDetailsSnapshot }
  | { ok: false; status: number; message: string }
> {
  if (propertyId == null || propertyId === "") {
    return { ok: false, status: 422, message: "propertyId is required" };
  }

  const cfg = getCoreLogicOAuthConfig();
  if (!cfg.ok) return { ok: false, status: 503, message: cfg.message };

  const token = await ensureCoreLogicAccessToken();
  if (!token.ok) {
    return { ok: false, status: token.status, message: token.message };
  }

  const accessToken = token.accessToken;
  const includeAvm = options?.includeAvm !== false;

  const [coreRes, additionalRes, siteRes, lastSaleRes, featuresRes] =
    await Promise.all([
      fetchSection(propertyId, "/attributes/core", accessToken),
      fetchSection(propertyId, "/attributes/additional", accessToken),
      fetchSection(propertyId, "/site", accessToken),
      fetchSection(propertyId, "/sales/last", accessToken),
      fetchSection(propertyId, "/features", accessToken),
    ]);

  const coreSection = sectionFromResult(coreRes);
  const additionalSection = sectionFromResult(additionalRes);
  const siteSection = sectionFromResult(siteRes);
  const lastSaleSection = sectionFromResult(lastSaleRes);
  const featuresSection = sectionFromResult(featuresRes);

  let avm: CoreLogicAvmSnapshot = {
    available: false,
    reason: "not_attempted",
  };
  let avmStatus: CoreLogicSectionStatus = "empty";

  if (includeAvm) {
    const avmRes = await coreLogicApiGet(
      `/au/properties/${encodeURIComponent(String(propertyId))}/avm/intellival/consumer/current`,
      accessToken,
      { base: "avm" },
    );
    const parsed = parseCoreLogicAvmResponse(avmRes);
    avm = parsed.snapshot;
    avmStatus = parsed.status;
  }

  const featuresParsed = featuresSection.data
    ? parseCoreLogicFeatures(featuresSection.data)
    : {};

  const lastSale =
    lastSaleSection.status === "ok"
      ? parseCoreLogicLastSale(lastSaleSection.data) ?? null
      : lastSaleSection.status === "empty"
        ? null
        : undefined;

  const anyOk =
    coreSection.status === "ok" ||
    additionalSection.status === "ok" ||
    siteSection.status === "ok" ||
    lastSaleSection.status === "ok" ||
    featuresSection.status === "ok" ||
    avmStatus === "ok";

  if (
    !anyOk &&
    [coreSection, additionalSection, siteSection, lastSaleSection, featuresSection].every(
      (s) => s.status === "error" || s.status === "unavailable",
    )
  ) {
    return {
      ok: false,
      status: 502,
      message:
        coreSection.message ||
        additionalSection.message ||
        "Cotality Property Details unavailable",
    };
  }

  const snapshot: CoreLogicPropertyDetailsSnapshot = {
    propertyId,
    fetchedAt: new Date().toISOString(),
    source: "property_details",
    ...(coreSection.data
      ? { core: parseCoreLogicCoreAttributes(coreSection.data) }
      : {}),
    ...(additionalSection.data
      ? { additional: parseCoreLogicAdditionalAttributes(additionalSection.data) }
      : {}),
    ...(siteSection.data
      ? { site: parseCoreLogicSiteDetails(siteSection.data) }
      : {}),
    ...(lastSale !== undefined ? { lastSale } : {}),
    ...featuresParsed,
    avm,
    sections: {
      core: coreSection.status,
      additional: additionalSection.status,
      site: siteSection.status,
      lastSale:
        lastSaleSection.status === "ok" && lastSale == null
          ? "empty"
          : lastSaleSection.status,
      features: featuresSection.status,
      avm: avmStatus,
    },
  };

  return { ok: true, snapshot };
}

/**
 * Business Identity — provider-neutral Core record.
 *
 * DigitalGate Core → Business Identity Service → ABR Connector
 *                                → (later) ASIC, Dreamscape, Google, user input
 *
 * Australia today: ABR (+ ASIC stub). US/UK/other = future registry connectors.
 */

import type { AbrEntitySnapshot } from "../connectors/abr/types";
import type {
  BusinessProfilePatch,
  OrganisationBusinessProfile,
} from "../org/business-profile-types";

export type BusinessIdentitySourceId =
  | "abr"
  | "asic"
  | "domain"
  | "google"
  | "user";

export type BusinessIdentityCountryPack = "AU" | "US" | "UK" | "OTHER";

export type BusinessIdentityIdentifiers = {
  /** Australian Business Number */
  abn?: string;
  /** Australian Company Number (via ABR ASIC search or entity) */
  acn?: string;
  /** Future: EIN, Companies House number, etc. */
  externalRegistryIds?: Record<string, string>;
};

export type BusinessIdentityEntity = {
  legalName?: string;
  tradingNames?: string[];
  businessNames?: string[];
  status?: string;
  typeCode?: string;
  typeDescription?: string;
  gstRegistered?: boolean;
  gstEffectiveFrom?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

/**
 * Central Business Identity record — merge of registry + user + future connectors.
 * Does not replace OrganisationBusinessProfile; maps into it for Setup / Profile.
 */
export type BusinessIdentityRecord = {
  organisationId?: string;
  countryPack: BusinessIdentityCountryPack;
  identifiers: BusinessIdentityIdentifiers;
  entity: BusinessIdentityEntity;
  /** Provider payloads / placeholders — never include secrets */
  sources: {
    abr?: AbrEntitySnapshot | null;
    /** Pending DSP — no production registration */
    asic?: { status: "pending_provider_approval" } | null;
    domain?: { connected?: boolean; hostname?: string } | null;
    google?: { placeId?: string; url?: string } | null;
    user?: Partial<OrganisationBusinessProfile> | null;
  };
  retrievedAt: string;
};

export function emptyBusinessIdentity(
  countryPack: BusinessIdentityCountryPack = "AU",
): BusinessIdentityRecord {
  return {
    countryPack,
    identifiers: {},
    entity: {},
    sources: {
      abr: null,
      asic: { status: "pending_provider_approval" },
      domain: null,
      google: null,
      user: null,
    },
    retrievedAt: new Date().toISOString(),
  };
}

/** Map ABR snapshot → Business Identity record (AU pack). */
export function identityFromAbr(
  abr: AbrEntitySnapshot,
  organisationId?: string,
): BusinessIdentityRecord {
  const tradingNames = abr.tradingNames?.length
    ? abr.tradingNames
    : undefined;
  const businessNames = abr.businessNames?.map((b) => b.organisationName);

  return {
    organisationId,
    countryPack: "AU",
    identifiers: {
      abn: abr.abn,
      acn: abr.acn,
    },
    entity: {
      legalName: abr.legalName,
      tradingNames,
      businessNames,
      status: abr.entityStatus ?? abr.abnStatus,
      typeCode: abr.entityType?.code,
      typeDescription: abr.entityType?.description,
      gstRegistered: abr.gstRegistered,
      gstEffectiveFrom: abr.gstEffectiveFrom,
      address: abr.address
        ? {
            state: abr.address.stateCode,
            postcode: abr.address.postcode,
            country: abr.address.country ?? "AU",
          }
        : undefined,
    },
    sources: {
      abr,
      asic: { status: "pending_provider_approval" },
      domain: null,
      google: null,
      user: null,
    },
    retrievedAt: abr.retrievedAt || new Date().toISOString(),
  };
}

/**
 * Map ABR / Business Identity fields onto Business Profile patch.
 * Only fills identity fields ABR knows — does not invent brand/logo/contacts.
 */
export function abrEntityToBusinessProfilePatch(
  abr: AbrEntitySnapshot,
): BusinessProfilePatch {
  const tradingName =
    abr.tradingNames[0] || abr.businessNames[0]?.organisationName || undefined;

  const patch: BusinessProfilePatch = {};
  if (abr.abn) patch.abn = abr.abn;
  if (abr.acn) patch.acn = abr.acn;
  if (abr.legalName) patch.businessName = abr.legalName;
  if (tradingName) patch.tradingName = tradingName;

  if (abr.address?.stateCode || abr.address?.postcode) {
    patch.address = {
      state: abr.address.stateCode,
      postcode: abr.address.postcode,
      country: abr.address.country ?? "AU",
    };
  }

  if (abr.gstRegistered != null) {
    patch.taxSettings = {
      country: "AU",
      gstRegistered: abr.gstRegistered,
      defaultTaxRateBps: abr.gstRegistered ? 1000 : undefined,
    };
  }

  return patch;
}

export function identityToBusinessProfilePatch(
  identity: BusinessIdentityRecord,
): BusinessProfilePatch {
  if (identity.sources.abr) {
    return abrEntityToBusinessProfilePatch(identity.sources.abr);
  }

  const patch: BusinessProfilePatch = {};
  if (identity.identifiers.abn) patch.abn = identity.identifiers.abn;
  if (identity.identifiers.acn) patch.acn = identity.identifiers.acn;
  if (identity.entity.legalName) patch.businessName = identity.entity.legalName;
  if (identity.entity.tradingNames?.[0]) {
    patch.tradingName = identity.entity.tradingNames[0];
  }
  if (identity.entity.address) {
    patch.address = { ...identity.entity.address };
  }
  if (identity.entity.gstRegistered != null) {
    patch.taxSettings = {
      country: identity.countryPack === "AU" ? "AU" : identity.entity.address?.country,
      gstRegistered: identity.entity.gstRegistered,
      defaultTaxRateBps: identity.entity.gstRegistered ? 1000 : undefined,
    };
  }
  return patch;
}

/** Merge ABR enrichment over an existing profile without wiping user fields. */
export function mergeAbrIntoProfile(
  current: OrganisationBusinessProfile | null | undefined,
  abr: AbrEntitySnapshot,
): OrganisationBusinessProfile {
  const patch = abrEntityToBusinessProfilePatch(abr);
  const base = current ?? {};
  return {
    ...base,
    ...patch,
    address: { ...base.address, ...patch.address },
    taxSettings: { ...base.taxSettings, ...patch.taxSettings },
    // Prefer ABR legal name only when profile name empty
    businessName: base.businessName?.trim()
      ? base.businessName
      : patch.businessName,
    tradingName: base.tradingName?.trim()
      ? base.tradingName
      : patch.tradingName,
    updatedAt: new Date().toISOString(),
  };
}

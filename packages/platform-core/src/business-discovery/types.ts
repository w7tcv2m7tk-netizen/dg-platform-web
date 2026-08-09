/**
 * Business Discovery Engine — Core Platform capability (Command Centre first).
 * @see docs/foundations/BUSINESS-DISCOVERY.md
 */

export type DiscoveryProviderId = "google_places" | "abn_lookup" | "manual";

/** Ephemeral search hit — do not dump wholesale into CRM. */
export type DiscoveryCandidate = {
  /** Stable client key for multi-select (provider:externalId). */
  key: string;
  provider: DiscoveryProviderId;
  externalId: string;
  businessName: string;
  location?: string;
  phone?: string;
  websiteUrl?: string;
  email?: string;
  rating?: number;
  ratingCount?: number;
  industry?: string;
  businessType?: string;
  /** Opaque refs safe to persist on import (e.g. place_id, ABN). */
  providerRefs: {
    googlePlaceId?: string;
    abn?: string;
    mapsUri?: string;
  };
  /** Provider confidence 0–1 for ranking only. */
  confidence: number;
};

export type DiscoverySearchInput = {
  industry?: string;
  location?: string;
  /** Search radius in km (Places location bias). */
  radiusKm?: 5 | 10 | 25 | 50;
  businessType?: string;
  /** Free-text override / business name. */
  q?: string;
  limit?: number;
};

export type DiscoveryProviderStatus = {
  id: DiscoveryProviderId;
  label: string;
  available: boolean;
  reason?: string;
};

export type DiscoverySearchResult = {
  query: DiscoverySearchInput;
  textQuery: string;
  candidates: DiscoveryCandidate[];
  providers: DiscoveryProviderStatus[];
  /** Warnings (geocode miss, partial provider failure). */
  warnings: string[];
};

export type DiscoveryScoreBreakdown = {
  overall: number;
  visibility: number;
  website: number;
  seo: number;
  aiVisibility: number;
  conversion: number;
  reputation: number;
  technology: number;
};

export type IndustryPackId =
  | "real_estate"
  | "finance"
  | "trades"
  | "professional"
  | "accommodation"
  | "automotive"
  | "general";

export type IndustryPack = {
  id: IndustryPackId;
  label: string;
  /** Phrases used to build Places / ABR text queries. */
  searchTerms: string[];
  auditFocus: string[];
};

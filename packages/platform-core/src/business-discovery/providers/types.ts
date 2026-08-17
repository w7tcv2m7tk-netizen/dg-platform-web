import type { DiscoveryCandidate, DiscoveryProviderId } from "../types";

export type ProviderSearchContext = {
  textQuery: string;
  location?: string;
  radiusKm?: number;
  latitude?: number;
  longitude?: number;
  postcode?: string;
  stateCode?: string;
  industry?: string;
  businessType?: string;
  limit: number;
};

export interface BusinessDataProvider {
  id: DiscoveryProviderId;
  label: string;
  isConfigured(): boolean;
  unavailableReason(): string | undefined;
  search(ctx: ProviderSearchContext): Promise<DiscoveryCandidate[]>;
}

export function candidateKey(
  provider: DiscoveryProviderId,
  externalId: string,
): string {
  return `${provider}:${externalId}`;
}

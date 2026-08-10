/**
 * Property Syndication Engine — channel adapters for RE listings.
 *
 * Domain Listings Management (sandbox → production) is the first adapter.
 * See docs/foundations/PROPERTY-SYNDICATION.md.
 */

export type SyndicationChannelId = "domain" | "rea" | "website" | (string & {});

export type ListingPlacementStatus =
  | "draft"
  | "validating"
  | "pending"
  | "published"
  | "withdrawn"
  | "error";

export type ListingPlacementSnapshot = {
  channel: SyndicationChannelId;
  status: ListingPlacementStatus;
  externalId?: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
};

export type SyndicationListingInput = {
  organisationId: string;
  propertyId: string;
  listingId: string;
  /** Portal-facing payload — adapters map to provider schema */
  payload: Record<string, unknown>;
};

export type SyndicationResult = {
  ok: boolean;
  status: ListingPlacementStatus;
  externalId?: string | null;
  message?: string;
  raw?: unknown;
};

/**
 * One portal (or website) adapter. Implement Domain first; REA/others later.
 */
export interface SyndicationChannelAdapter {
  readonly channel: SyndicationChannelId;
  validate(input: SyndicationListingInput): Promise<SyndicationResult>;
  publish(input: SyndicationListingInput): Promise<SyndicationResult>;
  update(input: SyndicationListingInput): Promise<SyndicationResult>;
  withdraw(input: SyndicationListingInput): Promise<SyndicationResult>;
  getStatus?(externalId: string): Promise<ListingPlacementSnapshot>;
}

const adapters = new Map<SyndicationChannelId, SyndicationChannelAdapter>();

export function registerSyndicationChannel(adapter: SyndicationChannelAdapter): void {
  adapters.set(adapter.channel, adapter);
}

export function getSyndicationChannel(
  channel: SyndicationChannelId,
): SyndicationChannelAdapter | undefined {
  return adapters.get(channel);
}

export function listSyndicationChannels(): SyndicationChannelId[] {
  return [...adapters.keys()];
}

/**
 * Domain Listings Management — stub until sandbox credentials + HTTP client land.
 * Register in app bootstrap when `re.syndication_domain_sandbox` is on.
 */
export const domainSyndicationStub: SyndicationChannelAdapter = {
  channel: "domain",
  async validate() {
    return {
      ok: false,
      status: "error",
      message:
        "Domain Listings Management not configured — add Sandbox to Domain Developer Portal project",
    };
  },
  async publish(input) {
    return this.validate(input);
  },
  async update(input) {
    return this.validate(input);
  },
  async withdraw(input) {
    return this.validate(input);
  },
};

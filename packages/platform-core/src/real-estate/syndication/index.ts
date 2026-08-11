export {
  getSyndicationChannel,
  listSyndicationChannels,
  registerSyndicationChannel,
  type ListingPlacementSnapshot,
  type ListingPlacementStatus,
  type SyndicationChannelAdapter,
  type SyndicationChannelId,
  type SyndicationListingInput,
  type SyndicationResult,
} from "./types";

export { domainSyndicationAdapter } from "./domain-adapter";
export { reaSyndicationAdapter } from "./rea-adapter";

import { domainSyndicationAdapter } from "./domain-adapter";
import { reaSyndicationAdapter } from "./rea-adapter";
import { registerSyndicationChannel } from "./types";

/** Register Domain channel (idempotent). Call from app bootstrap when RE syndication is enabled. */
export function ensureDomainSyndicationRegistered(): void {
  registerSyndicationChannel(domainSyndicationAdapter);
}

/** Register REA channel (idempotent). Scaffold — fail closed until partner API is live. */
export function ensureReaSyndicationRegistered(): void {
  registerSyndicationChannel(reaSyndicationAdapter);
}

/** Register Domain + REA Listing Hub channels. */
export function ensurePropertySyndicationRegistered(): void {
  ensureDomainSyndicationRegistered();
  ensureReaSyndicationRegistered();
}

/** @deprecated Use domainSyndicationAdapter */
export const domainSyndicationStub = domainSyndicationAdapter;

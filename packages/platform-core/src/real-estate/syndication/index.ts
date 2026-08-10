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

import { domainSyndicationAdapter } from "./domain-adapter";
import { registerSyndicationChannel } from "./types";

/** Register Domain channel (idempotent). Call from app bootstrap when RE syndication is enabled. */
export function ensureDomainSyndicationRegistered(): void {
  registerSyndicationChannel(domainSyndicationAdapter);
}

/** @deprecated Use domainSyndicationAdapter */
export const domainSyndicationStub = domainSyndicationAdapter;

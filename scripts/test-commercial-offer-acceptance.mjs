import assert from "node:assert/strict";
import {
  commercialOfferFromAcceptedOpportunity,
  commercialOfferFromSettings,
  isFounding10CommercialProspect,
} from "../packages/platform-core/src/billing/commercial-offer.ts";

const offer = {
  version: 1,
  id: "custom-1",
  label: "Accepted custom offer",
  status: "agreed",
  currency: "aud",
  amountCents: 12300,
  cadence: "monthly",
  platformTier: "professional",
  industryApps: [],
  industryTemplates: [],
  premiumApps: [],
  trialDays: 14,
};

assert.equal(
  commercialOfferFromSettings({ billing: { commercialOffer: offer } }),
  null,
  "stale organisation settings must not establish customer acceptance",
);

const accepted = {
  pipelineId: "sales",
  metadata: {
    commercial_offer: offer,
    custom_offer_token: "one-time-acceptance-token",
    custom_offer_claimed_by_org_id: "org-customer",
    custom_offer_claimed_at: "2026-10-18T00:00:00.000Z",
  },
};
const acceptedOffer = commercialOfferFromAcceptedOpportunity(accepted, "org-customer");
assert.equal(acceptedOffer?.id, offer.id);
assert.equal(acceptedOffer?.amountCents, offer.amountCents);
assert.equal(acceptedOffer?.trialDays, offer.trialDays);
for (const invalid of [
  { ...accepted, metadata: { ...accepted.metadata, custom_offer_claimed_by_org_id: undefined } },
  { ...accepted, metadata: { ...accepted.metadata, custom_offer_claimed_by_org_id: "org-other" } },
  { ...accepted, metadata: { ...accepted.metadata, custom_offer_claimed_at: undefined } },
  { ...accepted, metadata: { ...accepted.metadata, custom_offer_token: undefined } },
  { ...accepted, pipelineId: "founding_10" },
]) {
  assert.equal(commercialOfferFromAcceptedOpportunity(invalid, "org-customer"), null);
}
assert.equal(commercialOfferFromAcceptedOpportunity(accepted, ""), null);

assert.equal(isFounding10CommercialProspect({ foundingOnboarding: { invited: true } }), true);
assert.equal(isFounding10CommercialProspect({ billing: { foundingCustomer: true } }), true);
assert.equal(isFounding10CommercialProspect({ billing: { programme: "FOUNDING_CUSTOMER" } }), true);
assert.equal(isFounding10CommercialProspect({ billing: { programme: "standard" } }), false);
assert.equal(isFounding10CommercialProspect({}), false);

console.log("accepted custom-offer and Founding 10 neutrality checks passed");

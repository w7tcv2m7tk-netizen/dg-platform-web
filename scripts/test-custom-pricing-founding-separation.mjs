import fs from "node:fs";
import assert from "node:assert/strict";

const onboarding = fs.readFileSync("src/app/api/v1/onboarding/gen2/route.ts", "utf8");
const foundingAgreement = fs.readFileSync("src/app/api/v1/founding/agreement/route.ts", "utf8");
const foundingPage = fs.readFileSync("src/app/(shell)/founding/agreement/page.tsx", "utf8");
const foundingOfferApi = fs.readFileSync("src/app/api/v1/founding/commercial-offer/route.ts", "utf8");
const customOfferApi = fs.readFileSync("src/app/api/v1/billing/custom-offer/route.ts", "utf8");
const publicOfferApi = fs.readFileSync("src/app/api/public/custom-offer/route.ts", "utf8");
const customOfferPage = fs.readFileSync("src/app/custom-offer/[token]/page.tsx", "utf8");
const types = fs.readFileSync("packages/platform-core/src/founding/types.ts", "utf8");
const terms = fs.readFileSync("marketing/pages/founding-customer-terms.html", "utf8");

assert.match(onboarding, /return getOrganisationCommercialOffer\(organisationId\)/, "onboarding pricing must resolve from separately accepted organisation custom offer");
assert.doesNotMatch(onboarding, /commercialOfferSnapshot \?\?/, "Founding snapshot must not override onboarding pricing");
assert.doesNotMatch(foundingAgreement, /applyFoundingCommercialOfferToCustomer|getOrganisationCommercialOffer|commercialOfferSnapshot/, "Founding agreement must not apply pricing");
assert.doesNotMatch(foundingPage, /applyFoundingCommercialOfferToCustomer|getOrganisationCommercialOffer|commercialOffer=/, "Founding page must not attach pricing");
assert.match(foundingOfferApi, /retired_endpoint/, "legacy Founding pricing endpoint must be retired");
assert.match(customOfferApi, /setOpportunityCustomOffer/, "general CRM custom offer API must persist bespoke pricing");
assert.match(publicOfferApi, /claimOpportunityCustomOffer/, "customer must explicitly claim a custom offer");
assert.match(customOfferPage, /Accept offer & continue/, "private customer link must expose explicit acceptance");
assert.match(types, /Founding Customer status — limited places, not discounted access/, "Founding status must remain a programme benefit, not a discount");
assert.match(types, /custom pricing is a separate offer available to any customer/, "Founding benefits must describe custom pricing as independent");
assert.match(terms, /20% direct referral commission for the first 12 months/, "Founding referral benefit must remain documented");
assert.match(terms, /Founding status is a programme benefit, not a separate pricing tier/, "Founding legal terms must remain pricing-neutral");

console.log("custom pricing / Founding 10 separation: ok");

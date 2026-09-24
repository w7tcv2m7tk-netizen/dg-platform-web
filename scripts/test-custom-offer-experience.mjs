import fs from "node:fs";
import assert from "node:assert/strict";

const core = fs.readFileSync("packages/platform-core/src/billing/commercial-offer.ts", "utf8");
const operatorApi = fs.readFileSync("src/app/api/v1/billing/custom-offer/route.ts", "utf8");
const publicApi = fs.readFileSync("src/app/api/public/custom-offer/route.ts", "utf8");
const page = fs.readFileSync("src/app/custom-offer/[token]/page.tsx", "utf8");
const editor = fs.readFileSync("src/components/founding/FoundingCommercialOfferEditor.tsx", "utf8");
const stripe = fs.readFileSync("packages/platform-core/src/billing/platform-stripe.ts", "utf8");

assert.match(core, /custom_offer_claimed_by_org_id/);
assert.match(core, /Accepted custom pricing offers are locked and cannot be changed/);
assert.match(core, /already been accepted/);
assert.match(core, /tx\.opportunity\.updateMany/);
assert.match(core, /updatedAt: row\.updatedAt/);
assert.match(core, /custom_offer_claimed_at/);

assert.match(operatorApi, /function validatedSelections/);
assert.match(operatorApi, /listIndustries\(\)/);
assert.match(operatorApi, /parentId: item\.id/);
assert.match(operatorApi, /offer_locked/);
assert.match(operatorApi, /locked: Boolean\(current\.claimedByOrganisationId\)/);
assert.match(operatorApi, /current\.claimedByOrganisationId \? null : shareUrl/);

assert.match(publicApi, /offer_already_claimed/);
assert.match(publicApi, /status: 410/);
assert.match(publicApi, /platformLabel/);
assert.match(publicApi, /supportLabel/);
assert.match(publicApi, /offer\.industryApps\.map\(displayIndustry\)/);
assert.match(publicApi, /offer\.premiumApps\.map\(displayGrowth\)/);

assert.doesNotMatch(page, /independent of Founding 10 status/);
assert.match(page, /Accepting the offer saves these commercial terms/);
assert.match(page, /payment details are entered securely through Stripe later in activation/);
assert.match(page, /One-off charge due when secure Stripe activation is completed/);
assert.match(page, /Accept offer & continue to setup/);
assert.match(page, /private link then closes/);

assert.match(editor, /useState\("14"\)/);
assert.match(editor, /Customer accepted this offer/);
assert.match(editor, /Commercial terms are now locked/);
assert.match(editor, /legend="Business types"/);
assert.match(editor, /Copy private offer link/);

assert.match(stripe, /metadataList\(metadata\.dg_industry_templates\)/);
assert.match(stripe, /industryApps: \[\.\.\.new Set\(\[\.\.\.industryApps, \.\.\.industryTemplates\]\)\]/);
assert.match(stripe, /purchasedIndustryTemplates: industryTemplates/);
assert.match(stripe, /industryTemplates,/);

console.log("custom offer experience and commercial integrity checks passed");

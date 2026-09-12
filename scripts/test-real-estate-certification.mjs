import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const manifest = read("packages/platform-core/src/apps/builtins/real-estate.ts");
const overview = read("src/app/(shell)/apps/re/page.tsx");
const vendorPage = read("src/app/(shell)/apps/re/vendor-leads/page.tsx");
const buyerPage = read("src/app/(shell)/apps/re/buyer-leads/page.tsx");
const propertiesPage = read("src/app/(shell)/apps/re/properties/page.tsx");
const propertyDetail = read("src/app/(shell)/apps/re/properties/[id]/page.tsx");
const listingsPage = read("src/app/(shell)/apps/re/listings/page.tsx");
const bookingsPage = read("src/app/(shell)/apps/re/bookings/page.tsx");
const settlementsPage = read("src/app/(shell)/apps/re/settlements/page.tsx");
const prospectingPage = read("src/app/(shell)/apps/re/vendor-prospecting/page.tsx");
const vendorPipeline = read("src/components/re/VendorLeadPipeline.tsx");
const buyerPipeline = read("src/components/re/BuyerLeadPipeline.tsx");
const propertyList = read("src/components/re/PropertyList.tsx");
const listingList = read("src/components/re/ListingList.tsx");
const bookingsPanel = read("src/components/re/ReBookingsPanel.tsx");
const leadsApi = read("src/app/api/v1/leads/route.ts");
const propertiesApi = read("src/app/api/v1/properties/route.ts");
const propertyDetailApi = read("src/app/api/v1/properties/[id]/route.ts");
const bookingApi = read("src/app/api/v1/re/bookings/route.ts");
const platformApi = read("src/lib/platform-api.ts");
const access = read("src/lib/real-estate-page-access.ts");

test("Real Estate customer pages use native shared platform context", () => {
  for (const source of [overview, vendorPage, buyerPage, propertiesPage, propertyDetail, listingsPage, bookingsPage, settlementsPage]) {
    assert.match(source, /getPlatformPageContext/);
    assert.doesNotMatch(source, /fetchPortalMe/);
    assert.doesNotMatch(source, /resolveActivePlatformSession/);
    assert.doesNotMatch(source, /currentUser/);
  }
});

test("Real Estate property mutations require organisation-wide authority", () => {
  assert.match(propertiesApi, /requirePermission/);
  assert.match(propertiesApi, /module:\s*"industry"/);
  assert.match(propertiesApi, /scope:\s*"organisation"/);
  assert.match(propertiesApi, /subModule:\s*"real-estate"/);
  assert.match(platformApi, /realEstatePropertyWritePermission/);
  assert.match(platformApi, /\/api\\\/v1\\\/properties/);
  assert.match(platformApi, /subModule:\s*"real-estate"/);
  assert.match(access, /canManageRealEstate/);
});

test("Lead mutations cannot promote assigned scope into organisation-wide writes", () => {
  assert.match(leadsApi, /requirePermission/);
  assert.match(leadsApi, /module:\s*"crm"/);
  assert.match(leadsApi, /action:\s*"create"/);
  assert.match(leadsApi, /action:\s*"edit"/);
  assert.match(leadsApi, /scope:\s*"organisation"/);
  assert.match(vendorPage, /canCreateOrganisationLeads/);
  assert.match(vendorPage, /canEditOrganisationLeads/);
  assert.match(buyerPage, /canCreateOrganisationLeads/);
  assert.match(buyerPage, /canEditOrganisationLeads/);
});

test("normal Real Estate customer journeys expose no WordPress sync or publish controls", () => {
  for (const source of [vendorPipeline, buyerPipeline, propertyDetail, propertyDetailApi]) {
    assert.doesNotMatch(source, /Sync from WordPress|Sync buyers from WordPress|Test connection|publish_to_website|PublishToWebsiteButton|publishPropertyToWordPress/);
  }
  assert.doesNotMatch(vendorPipeline, /connectors\/wordpress/);
  assert.doesNotMatch(buyerPipeline, /sync_wordpress/);
});

test("unfinished vendor prospecting model is removed from live navigation", () => {
  assert.doesNotMatch(manifest, /vendor-prospecting/);
  assert.match(prospectingPage, /redirect\("\/apps\/re\/vendor-leads"\)/);
  assert.doesNotMatch(prospectingPage, /Property Opportunity Score|operating model|Live ranked owners/);
});

test("Real Estate listings use organisation money settings", () => {
  assert.match(listingsPage, /getOrganisationMoneySettings/);
  assert.match(listingList, /Intl\.NumberFormat/);
  assert.match(listingList, /currency/);
  assert.match(propertyDetail, /formatMoneyFromCents/);
  assert.doesNotMatch(listingList, /\$\$\{/);
  assert.doesNotMatch(propertyDetail, /Guide price: \$/);
});

test("Real Estate bookings require write authority and use organisation timezone", () => {
  assert.match(bookingApi, /requirePermission/);
  assert.match(bookingApi, /subModule:\s*"real-estate"/);
  assert.match(bookingsPage, /canManageRealEstate/);
  assert.match(bookingsPage, /timezone/);
  assert.match(bookingsPanel, /zonedLocalToUtc/);
  assert.match(bookingsPanel, /timeZone/);
});

test("Real Estate interactive customer controls meet the native touch-target floor", () => {
  for (const source of [vendorPipeline, buyerPipeline, propertyList, listingList, bookingsPanel]) {
    assert.match(source, /min-h-11/);
  }
});

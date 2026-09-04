import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const overview = read("src/app/(shell)/apps/accommodation/page.tsx");
const checkIns = read("src/app/(shell)/apps/accommodation/check-ins/page.tsx");
const guests = read("src/app/(shell)/apps/accommodation/guests/page.tsx");
const payments = read("src/app/(shell)/apps/accommodation/payments/page.tsx");
const reviews = read("src/app/(shell)/apps/accommodation/reviews/page.tsx");
const dashboard = read("src/components/accommodation/AccommodationDashboard.tsx");
const summary = read("src/lib/accommodation-summary.ts");
const overviewConnectors = read("src/lib/overview-connectors.ts");
const reviewsFeed = read("src/lib/reviews-feed.ts");

const accommodationRuntimeSources = [overview, checkIns, guests, payments, reviews];

test("Accommodation app read paths do not resolve WordPress runtime sources", () => {
  for (const source of accommodationRuntimeSources) {
    assert.doesNotMatch(source, /accommodationConnectorForSession/);
    assert.doesNotMatch(source, /fetchWpAccommodation/);
    assert.doesNotMatch(source, /getWpAccommodationSite/);
    assert.doesNotMatch(source, /listWpAccommodationSites/);
    assert.doesNotMatch(source, /AccommodationSitePicker/);
  }

  assert.equal(fs.existsSync("src/lib/accommodation-connector.ts"), false);
});

test("Accommodation overview and dashboard use the native summary contract", () => {
  assert.match(overview, /buildAccommodationSummary/);
  assert.match(summary, /listAccommodationUnits/);
  assert.match(summary, /listStayBookings/);
  assert.match(summary, /listAccommodationGuests/);
  assert.doesNotMatch(summary, /WordPress|fetchWp|accommodationConnectorForSession/);
  assert.match(dashboard, /AccommodationSummary/);
  assert.doesNotMatch(dashboard, /WpAccommodationSummary|showWordPress/);
});

test("Accommodation guests do not import WordPress data on page read", () => {
  assert.match(guests, /listAccommodationGuests/);
  assert.doesNotMatch(guests, /upsertGuestFromWpRow|fetchWpAccommodationGuests/);
});

test("Business Overview and Reviews do not probe Accommodation through WordPress", () => {
  assert.match(overviewConnectors, /buildAccommodationSummary/);
  assert.doesNotMatch(overviewConnectors, /fetchWpAccommodationSummary|accommodationConnectorForSession/);

  assert.match(reviewsFeed, /getOrgGbpSyncSnapshot/);
  assert.doesNotMatch(
    reviewsFeed,
    /fetchWpAccommodationReviews|mapWpAccReviewsToFeed|accommodationConnectorForSession/,
  );
});

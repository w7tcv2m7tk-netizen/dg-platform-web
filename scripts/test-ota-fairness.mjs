import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildOtaOrganisationCandidates,
  orderConfiguredOtaSources,
} from "../packages/platform-core/src/accommodation/ota-cron-fairness.ts";
import {
  orderOtaSourcesByLastSync,
  selectRotatingOtaOrganisations,
} from "../packages/platform-core/src/accommodation/ota-fairness.ts";

const old = new Date("2026-09-01T00:00:00.000Z");
const recent = new Date("2026-09-03T00:00:00.000Z");

const organisationIds = Array.from({ length: 120 }, (_, index) => `org-${String(index).padStart(3, "0")}`);
const batchOne = selectRotatingOtaOrganisations(organisationIds, 50, new Date(0));
const batchTwo = selectRotatingOtaOrganisations(organisationIds, 50, new Date(15 * 60 * 1000));
const batchThree = selectRotatingOtaOrganisations(organisationIds, 50, new Date(30 * 60 * 1000));
assert.equal(batchOne.length, 50);
assert.equal(batchTwo.length, 50);
assert.equal(batchThree.length, 50);
assert.equal(new Set([...batchOne, ...batchTwo, ...batchThree]).size, 120);
assert.deepEqual(batchOne.slice(0, 2), ["org-000", "org-001"]);
assert.deepEqual(batchTwo.slice(0, 2), ["org-050", "org-051"]);
assert.deepEqual(batchThree.slice(0, 2), ["org-100", "org-101"]);

assert.deepEqual(
  orderOtaSourcesByLastSync({
    airbnbLastSyncAt: recent,
    bookingcomLastSyncAt: old,
    now: recent,
  }),
  ["bookingcom", "airbnb"],
);
assert.deepEqual(
  orderOtaSourcesByLastSync({
    airbnbLastSyncAt: old,
    bookingcomLastSyncAt: recent,
    now: recent,
  }),
  ["airbnb", "bookingcom"],
);

const nearEqualAirbnb = new Date("2026-09-03T00:00:02.000Z");
const nearEqualBooking = new Date("2026-09-03T00:00:08.000Z");
const slotOne = new Date("2026-09-03T00:01:00.000Z");
const slotTwo = new Date("2026-09-03T00:16:00.000Z");
const firstSlotOrder = orderOtaSourcesByLastSync({
  airbnbLastSyncAt: nearEqualAirbnb,
  bookingcomLastSyncAt: nearEqualBooking,
  now: slotOne,
  rotationKey: "tenant-rotation-test",
});
const secondSlotOrder = orderOtaSourcesByLastSync({
  airbnbLastSyncAt: nearEqualAirbnb,
  bookingcomLastSyncAt: nearEqualBooking,
  now: slotTwo,
  rotationKey: "tenant-rotation-test",
});
assert.notDeepEqual(
  firstSlotOrder,
  secondSlotOrder,
  "near-equal OTA feeds must alternate priority across consecutive cron intervals",
);

const singleFeedCandidates = buildOtaOrganisationCandidates([
  {
    organisationId: "airbnb-only",
    airbnbIcalUrl: "https://example.com/airbnb.ics",
    bookingcomIcalUrl: null,
    airbnbLastSyncAt: recent,
    bookingcomLastSyncAt: null,
  },
  {
    organisationId: "booking-only",
    airbnbIcalUrl: null,
    bookingcomIcalUrl: "https://example.com/booking.ics",
    airbnbLastSyncAt: null,
    bookingcomLastSyncAt: old,
  },
  {
    organisationId: "blank-only",
    airbnbIcalUrl: "   ",
    bookingcomIcalUrl: null,
    airbnbLastSyncAt: null,
    bookingcomLastSyncAt: null,
  },
]);
assert.equal(singleFeedCandidates.length, 2, "blank OTA URLs must not consume a cron organisation slot");
assert.deepEqual(orderConfiguredOtaSources(singleFeedCandidates[0].units), ["airbnb"]);
assert.deepEqual(orderConfiguredOtaSources(singleFeedCandidates[1].units), ["bookingcom"]);

const mixedUnits = [
  {
    organisationId: "mixed",
    airbnbIcalUrl: "https://example.com/a.ics",
    bookingcomIcalUrl: "https://example.com/b.ics",
    airbnbLastSyncAt: recent,
    bookingcomLastSyncAt: old,
  },
];
assert.deepEqual(
  orderConfiguredOtaSources(mixedUnits, { organisationId: "mixed", now: recent }),
  ["bookingcom", "airbnb"],
);

const neverSyncedSource = [
  {
    organisationId: "needs-first-sync",
    airbnbIcalUrl: "https://example.com/a.ics",
    bookingcomIcalUrl: "https://example.com/b.ics",
    airbnbLastSyncAt: recent,
    bookingcomLastSyncAt: null,
  },
];
assert.deepEqual(
  orderConfiguredOtaSources(neverSyncedSource, {
    organisationId: "needs-first-sync",
    now: recent,
  }),
  ["bookingcom", "airbnb"],
);

const source = fs.readFileSync(
  new URL("../packages/platform-core/src/accommodation/ota-cron-fairness.ts", import.meta.url),
  "utf8",
);
const route = fs.readFileSync(
  new URL("../src/app/api/cron/ota-ical-sync/route.ts", import.meta.url),
  "utf8",
);
assert.match(source, /selectRotatingOtaOrganisations\(/);
assert.match(source, /organisationId,/);
assert.doesNotMatch(source, /take:\s*limit/);
assert.match(route, /syncFairOtaCalendarsCron\(\{ limitOrgs: 50 \}\)/);

console.log("OTA fairness regression tests passed");

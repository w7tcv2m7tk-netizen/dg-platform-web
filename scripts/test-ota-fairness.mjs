import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildOtaOrganisationCandidates,
  orderConfiguredOtaSources,
} from "../packages/platform-core/src/accommodation/ota-cron-fairness.ts";
import {
  orderOtaSourcesByLastSync,
  selectDueOtaOrganisations,
} from "../packages/platform-core/src/accommodation/ota-fairness.ts";

const old = new Date("2026-09-01T00:00:00.000Z");
const recent = new Date("2026-09-03T00:00:00.000Z");

assert.deepEqual(
  selectDueOtaOrganisations(
    [
      { organisationId: "recent", lastSyncAt: recent },
      { organisationId: "never-b", lastSyncAt: null },
      { organisationId: "old", lastSyncAt: old },
      { organisationId: "never-a", lastSyncAt: null },
    ],
    3,
  ),
  ["never-a", "never-b", "old"],
);

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
assert.equal(
  singleFeedCandidates.find((row) => row.organisationId === "airbnb-only")?.lastSyncAt?.toISOString(),
  recent.toISOString(),
);
assert.equal(
  singleFeedCandidates.find((row) => row.organisationId === "booking-only")?.lastSyncAt?.toISOString(),
  old.toISOString(),
);
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

const neverSyncedConfiguredFeed = buildOtaOrganisationCandidates([
  {
    organisationId: "needs-first-sync",
    airbnbIcalUrl: "https://example.com/a.ics",
    bookingcomIcalUrl: "https://example.com/b.ics",
    airbnbLastSyncAt: recent,
    bookingcomLastSyncAt: null,
  },
]);
assert.equal(neverSyncedConfiguredFeed[0].lastSyncAt, null);

const source = fs.readFileSync(
  new URL("../packages/platform-core/src/accommodation/ota-cron-fairness.ts", import.meta.url),
  "utf8",
);
const route = fs.readFileSync(
  new URL("../src/app/api/cron/ota-ical-sync/route.ts", import.meta.url),
  "utf8",
);
assert.match(source, /selectDueOtaOrganisations\(candidates, limit\)/);
assert.match(source, /organisationId,/);
assert.doesNotMatch(source, /take:\s*limit/);
assert.match(route, /syncFairOtaCalendarsCron\(\{ limitOrgs: 50 \}\)/);

console.log("OTA fairness regression tests passed");

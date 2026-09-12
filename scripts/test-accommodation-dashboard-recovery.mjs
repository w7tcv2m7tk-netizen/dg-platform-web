import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(
  new URL("../src/components/accommodation/AccommodationDashboard.tsx", import.meta.url),
  "utf8",
);
const overview = readFileSync(
  new URL("../src/app/(shell)/apps/accommodation/page.tsx", import.meta.url),
  "utf8",
);
const summary = readFileSync(
  new URL("../src/lib/accommodation-summary.ts", import.meta.url),
  "utf8",
);
const unitsPage = readFileSync(
  new URL("../src/app/(shell)/apps/accommodation/units/page.tsx", import.meta.url),
  "utf8",
);
const checkIns = readFileSync(
  new URL("../src/app/(shell)/apps/accommodation/check-ins/page.tsx", import.meta.url),
  "utf8",
);
const paymentsPage = readFileSync(
  new URL("../src/app/(shell)/apps/accommodation/payments/page.tsx", import.meta.url),
  "utf8",
);
const paymentsTable = readFileSync(
  new URL("../src/components/accommodation/AccommodationPaymentsTable.tsx", import.meta.url),
  "utf8",
);
const platformApi = readFileSync(new URL("../src/lib/platform-api.ts", import.meta.url), "utf8");

test("accommodation load failures do not masquerade as empty onboarding", () => {
  assert.match(dashboard, /Accommodation is temporarily unavailable/);
  assert.match(dashboard, /not changed by this loading error/);
  assert.doesNotMatch(dashboard, /WordPress/);
});

test("accommodation dashboard customer actions meet the native touch target floor", () => {
  assert.match(dashboard, /min-h-11/);
  assert.match(dashboard, /Open units/);
  assert.match(dashboard, /Open bookings/);
});

test("overview summary uses the organisation timezone", () => {
  assert.match(overview, /select: \{ timezone: true \}/);
  assert.match(overview, /buildAccommodationSummary\(session\.organisationId, \{ timeZone \}\)/);
  assert.match(summary, /accToday\(options\.timeZone\)/);
  assert.match(summary, /housekeepingBoardFromUnits\(units, today\)/);
});

test("units page stays on native organisation context with no legacy site picker", () => {
  assert.match(unitsPage, /getPlatformPageContext/);
  assert.match(unitsPage, /loadUnitsForOps\(session\)/);
  assert.match(unitsPage, /AccommodationUnit \(Neon\)/);
  assert.doesNotMatch(unitsPage, /AccommodationSitePicker/);
  assert.doesNotMatch(unitsPage, /listWpAccommodationSites/);
  assert.doesNotMatch(unitsPage, /getWpAccommodationSite/);
});

test("check-in windows use the organisation timezone instead of a Brisbane label", () => {
  assert.match(checkIns, /select: \{ timezone: true \}/);
  assert.match(checkIns, /accToday\(organisationTimeZone\)/);
  assert.match(checkIns, /local date/);
  assert.doesNotMatch(checkIns, /\{today\} Brisbane/);
});

test("check-in guest actions meet the native touch target floor", () => {
  assert.match(checkIns, /min-h-11/);
  assert.match(checkIns, /Email guest/);
  assert.match(checkIns, /Call/);
});

test("payments use organisation locale and currency rather than hard-coded AUD", () => {
  assert.match(paymentsPage, /select: \{ currency: true, locale: true \}/);
  assert.match(paymentsPage, /currency=\{currency\}/);
  assert.match(paymentsPage, /locale=\{locale\}/);
  assert.match(paymentsTable, /formatMoney\(b\.total, locale, currency\)/);
  assert.doesNotMatch(paymentsTable, /function formatAud/);
});

test("payment mutation controls meet the native touch target floor", () => {
  assert.match(paymentsTable, /min-h-11/);
  assert.match(paymentsTable, /Mark paid/);
  assert.match(paymentsTable, /Mark unpaid/);
});

test("accommodation writes require organisation-scope Industry permission", () => {
  assert.match(platformApi, /requestPathname\(req\) !== "\/api\/v1\/accommodation"/);
  assert.match(platformApi, /module: "industry"/);
  assert.match(platformApi, /scope: "organisation"/);
  assert.match(platformApi, /subModule: "accommodation"/);
  assert.match(platformApi, /method === "DELETE" \? "delete" : "edit"/);
  assert.match(platformApi, /accommodationWritePermission\(req, session\)/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { resolveDgLegacyRequest } from "../src/lib/dg-legacy-urls.ts";
import {
  DG_STRATEGY_SESSION_SLUG,
  isDgStrategySessionPage,
} from "../src/lib/dg-strategy-session.ts";
import {
  consultationGridSlots,
  consultationSlotConflicts,
} from "../packages/platform-core/src/marketing/consultation-availability.ts";

const legacy = fs.readFileSync("src/lib/dg-legacy-urls.ts", "utf8");
const byHost = fs.readFileSync("src/app/sites/by-host/page.tsx", "utf8");
const renderer = fs.readFileSync("src/components/websites/WebsiteRenderer.tsx", "utf8");
const capture = fs.readFileSync(
  "src/components/websites/StrategySessionCapture.tsx",
  "utf8",
);
const enquiry = fs.readFileSync(
  "packages/platform-core/src/marketing/dg-enquiry-capture.ts",
  "utf8",
);
const slotsApi = fs.readFileSync(
  "src/app/api/public/consultation-slots/route.ts",
  "utf8",
);
const enquiryApi = fs.readFileSync("src/app/api/public/dg-enquiry/route.ts", "utf8");

test("/strategy-session no longer redirects to /contact", () => {
  assert.equal(resolveDgLegacyRequest("/strategy-session"), null);
  assert.equal(resolveDgLegacyRequest("/strategy-session/"), null);
  assert.doesNotMatch(legacy, /"\/strategy-session":\s*"\/contact"/);
  assert.match(
    legacy,
    /export const DG_PAGE_ALIASES/,
    "page aliases still derive from redirects — strategy-session must not alias to contact",
  );
});

test("strategy-session is a public DigitalGate booking page", () => {
  assert.equal(isDgStrategySessionPage("digitalgate", "strategy-session"), true);
  assert.equal(isDgStrategySessionPage("digitalgate", DG_STRATEGY_SESSION_SLUG), true);
  assert.equal(isDgStrategySessionPage("roe-realty", "strategy-session"), false);
  assert.match(byHost, /nativeDgStrategySessionPage/);
  assert.match(byHost, /isDgStrategySessionPage\(slug, pageSlug\)/);
  assert.match(renderer, /<StrategySessionCapture/);
  assert.match(capture, /DG_STRATEGY_SESSION_TITLE/);
  assert.match(
    fs.readFileSync("src/lib/dg-strategy-session.ts", "utf8"),
    /Book a DigitalGate Strategy Session/,
  );
});

test("availability comes from the existing consultation slot engine", () => {
  assert.match(slotsApi, /getConsultationAvailability/);
  assert.match(slotsApi, /siteSlug/);
  assert.match(
    capture,
    /\/api\/public\/consultation-slots\?date=\$\{encodeURIComponent\(dateIso\)\}&site=digitalgate/,
  );
  const weekday = "2026-09-11"; // Friday
  const sunday = "2026-09-13";
  assert.ok(consultationGridSlots(weekday).includes("09:00"));
  assert.deepEqual(consultationGridSlots(sunday), []);
  assert.equal(consultationSlotConflicts("09:00", ["09:00"]), true);
  assert.equal(consultationSlotConflicts("10:00", ["09:00"]), false);
});

test("valid booking submits through captureDgEnquiry for DigitalGate only", () => {
  assert.match(capture, /type: "consultation"/);
  assert.match(capture, /siteSlug: siteSlug \|\| "digitalgate"/);
  assert.match(capture, /pageSlug: "strategy-session"/);
  assert.match(capture, /fetch\("\/api\/public\/dg-enquiry"/);
  assert.match(enquiry, /siteSlug = input\.siteSlug\?\.trim\(\) \|\| "digitalgate"/);
  assert.match(enquiry, /const organisationId = await resolveOrgId\(siteSlug\)/);
  assert.match(enquiry, /page_slug:\s*\n\s*input\.type === "founding_10"/);
  assert.match(enquiry, /input\.type === "consultation"\s*\n\s*\? "strategy-session"/);
  assert.match(enquiry, /assertConsultationSlotAvailable/);
  assert.ok(
    enquiry.indexOf("assertConsultationSlotAvailable") <
      enquiry.indexOf("await createLead"),
    "slot + org validation must run before the lead is written",
  );
});

test("invalid booking input is rejected before write", () => {
  assert.match(enquiry, /message: "phone is required"/);
  assert.match(enquiry, /message: "business name is required"/);
  assert.ok(
    enquiry.indexOf('message: "phone is required"') <
      enquiry.indexOf("await assertConsultationSlotAvailable"),
    "consultation field validation must run before slot lookup",
  );
  assert.match(enquiryApi, /result\.code === "validation_error"/);
  assert.match(enquiryApi, /status: 422/);
  assert.match(capture, /Please select a date and time/);
  assert.match(capture, /name, email, mobile and business name/);
});

test("confirmation state is rendered after a successful booking", () => {
  assert.match(capture, /data-testid="strategy-session-confirmation"/);
  assert.match(capture, /You’re booked|You're booked/);
  assert.match(enquiryApi, /type === "consultation"\) next\.pathname = "\/strategy-session"/);
  assert.match(enquiry, /sendMessage/);
  assert.match(enquiry, /Platform Consultation/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/app/(shell)/apps/crm/timeline/page.tsx", "utf8");

test("Timeline requires its explicit read entitlement before organisation activity reads", () => {
  assert.match(page, /getAuthorisedPlatformPageSession\("crm\.timeline\.read"\)/);
  assert.ok(
    page.indexOf('getAuthorisedPlatformPageSession("crm.timeline.read")') <
      page.indexOf("listOrganisationActivities({"),
  );
  assert.match(page, /organisationId: session\.organisationId/);
});

test("Timeline record deep-links respect linked-object read entitlements", () => {
  assert.match(page, /crm\.contacts\.read/);
  assert.match(page, /crm\.companies\.read/);
  assert.match(page, /crm\.opportunities\.read/);
  assert.match(page, /entityType === "Contact" && access\.contacts/);
  assert.match(page, /entityType === "Company" && access\.companies/);
  assert.match(page, /entityType === "Opportunity" && access\.opportunities/);
});

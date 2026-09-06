import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  "src/app/api/v1/communications/messages/route.ts",
  "utf8",
);
const compose = fs.readFileSync(
  "src/app/(shell)/apps/communications/compose/page.tsx",
  "utf8",
);
const sent = fs.readFileSync(
  "src/app/(shell)/apps/communications/sent/page.tsx",
  "utf8",
);
const scheduled = fs.readFileSync(
  "src/app/(shell)/apps/communications/scheduled/page.tsx",
  "utf8",
);

test("communications health requires read authority", () => {
  assert.match(route, /requireFeature\(session, "communications\.read"\)/);
  assert.ok(
    route.indexOf('requireFeature(session, "communications.read")') <
      route.indexOf("communicationsHealthCheck(session.organisationId)"),
  );
});

test("email send and other channel writes have explicit send authority", () => {
  assert.match(route, /channel === "email" \? "communications\.email\.send" : "communications\.write"/);
  assert.ok(
    route.indexOf("const sendDenied = requireFeature(") < route.indexOf("scheduleOutboundEmail({"),
  );
  assert.ok(route.indexOf("const sendDenied = requireFeature(") < route.indexOf("sendMessage({"));
});

test("linked CRM objects require read authority and tenant validation", () => {
  for (const feature of [
    "crm.contacts.read",
    "crm.companies.read",
    "crm.opportunities.read",
  ]) {
    assert.ok(route.includes(`"${feature}"`), `missing ${feature}`);
  }

  assert.match(route, /getContact\(session\.organisationId, contactId\)/);
  assert.match(route, /getCompany\(session\.organisationId, companyId\)/);
  assert.match(route, /getOpportunity\(session\.organisationId, opportunityId\)/);
  assert.match(route, /linked_contact_not_found/);
  assert.match(route, /linked_company_not_found/);
  assert.match(route, /linked_opportunity_not_found/);
});

test("scheduled email receives only validated canonical link ids", () => {
  assert.match(route, /contactId: contactId \|\| undefined/);
  assert.match(route, /opportunityId: opportunityId \|\| undefined/);
  assert.match(route, /companyId: companyId \|\| undefined/);
  assert.ok(route.indexOf("validateLinkedCrmTargets({") < route.indexOf("scheduleOutboundEmail({"));
});

test("Compose requires email-send authority before CRM and signature reads", () => {
  assert.match(
    compose,
    /getAuthorisedPlatformPageSession\("communications\.email\.send"\)/,
  );
  assert.match(compose, /sessionHasFeature\(session, "crm\.contacts\.read"\)/);
  assert.match(compose, /sessionHasFeature\(session, "crm\.companies\.read"\)/);
  assert.match(compose, /sessionHasFeature\(session, "crm\.opportunities\.read"\)/);
  assert.match(compose, /getOpportunity\(session\.organisationId, opportunityId\)/);
  assert.doesNotMatch(compose, /opportunityId=\{params\.opportunityId/);
});

test("Sent and Scheduled reads require communications.read", () => {
  assert.match(sent, /getAuthorisedPlatformPageSession\("communications\.read"\)/);
  assert.match(scheduled, /getAuthorisedPlatformPageSession\("communications\.read"\)/);
});

test("opening Scheduled can flush email only for authorised senders", () => {
  assert.match(
    scheduled,
    /sessionHasFeature\(session, "communications\.email\.send"\)/,
  );
  assert.match(scheduled, /process\.env\.DATABASE_URL && canSendEmail/);
  assert.ok(
    scheduled.indexOf("const canSendEmail") < scheduled.indexOf("processDueScheduledEmails({"),
  );
});

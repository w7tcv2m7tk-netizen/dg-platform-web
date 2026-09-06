import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  "src/app/api/v1/communications/messages/route.ts",
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

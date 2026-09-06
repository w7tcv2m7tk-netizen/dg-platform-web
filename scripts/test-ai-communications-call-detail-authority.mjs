import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "src/app/(shell)/apps/ai-communications/call-centre/[id]/page.tsx",
  "utf8",
);

test("call detail requires Call Centre read authority", () => {
  assert.match(
    page,
    /getAuthorisedPlatformPageSession\("comms\.call_centre\.read"\)/,
  );
  assert.doesNotMatch(page, /getPlatformPageContext\(/);
});

test("transcript messages are not queried without recording authority", () => {
  assert.match(page, /sessionHasFeature\(session, "comms\.voice\.recording"\)/);
  assert.match(
    page,
    /canHear \? listSessionMessages\(session\.organisationId, id\) : Promise\.resolve\(\[\]\)/,
  );
});

test("CRM deep links respect object read authority", () => {
  assert.match(page, /sessionHasFeature\(session, "crm\.contacts\.read"\)/);
  assert.match(page, /sessionHasFeature\(session, "crm\.opportunities\.read"\)/);
  assert.match(page, /row\.contactId && canViewContacts/);
  assert.match(page, /row\.opportunityId && canViewOpportunities/);
});

test("call detail reads remain scoped to the authorised organisation", () => {
  assert.match(page, /getCommunicationSession\(session\.organisationId, id\)/);
  assert.match(page, /listSessionActions\(session\.organisationId, id\)/);
});

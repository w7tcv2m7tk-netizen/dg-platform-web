import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  "src/app/api/v1/communications/sessions/[id]/route.ts",
  "utf8",
);

test("session detail requires Call Centre read authority before tenant reads", () => {
  const authority = route.indexOf('requireFeature(session, "comms.call_centre.read")');
  const sessionRead = route.indexOf("getCommunicationSession(session.organisationId, id)");

  assert.ok(authority >= 0);
  assert.ok(sessionRead > authority);
});

test("session messages are not queried without recording authority", () => {
  assert.match(route, /sessionHasFeature\(session, "comms\.voice\.recording"\)/);
  assert.match(
    route,
    /canHear \? listSessionMessages\(session\.organisationId, id\) : Promise\.resolve\(\[\]\)/,
  );
  assert.doesNotMatch(route, /messages\.map\(\(msg\).*\[restricted\]/s);
});

test("session detail reads remain scoped to the active organisation", () => {
  assert.match(route, /getCommunicationSession\(session\.organisationId, id\)/);
  assert.match(route, /listSessionMessages\(session\.organisationId, id\)/);
  assert.match(route, /listSessionActions\(session\.organisationId, id\)/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  "src/app/api/v1/communications/signatures/route.ts",
  "utf8",
);
const page = fs.readFileSync(
  "src/app/(shell)/apps/communications/signatures/page.tsx",
  "utf8",
);

test("Signature reads require communications.read", () => {
  assert.match(route, /requireFeature\(session, "communications\.read"\)/);
  assert.match(page, /getAuthorisedPlatformPageSession\("communications\.read"\)/);
  assert.ok(
    page.indexOf('getAuthorisedPlatformPageSession("communications.read")') <
      page.indexOf("listCommunicationSignatures(session.organisationId)"),
  );
});

test("Signature mutations require communications.write before tenant write checks", () => {
  const occurrences = route.match(/requireFeature\(session, "communications\.write"\)/g) ?? [];
  assert.equal(occurrences.length, 3);
  assert.ok(
    route.indexOf('requireFeature(session, "communications.write")') <
      route.indexOf("tenantWriteEntitlementBlock(session)"),
  );
});

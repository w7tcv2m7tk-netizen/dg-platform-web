import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const gmailConnect = fs.readFileSync(
  "src/app/api/connectors/google-gmail/connect/route.ts",
  "utf8",
);
const microsoftConnect = fs.readFileSync(
  "src/app/api/connectors/microsoft-365/connect/route.ts",
  "utf8",
);
const gmailCallback = fs.readFileSync(
  "src/app/api/connectors/google-gmail/callback/route.ts",
  "utf8",
);
const microsoftCallback = fs.readFileSync(
  "src/app/api/connectors/microsoft-365/callback/route.ts",
  "utf8",
);
const gmailStatus = fs.readFileSync(
  "src/app/api/v1/connectors/google-gmail/status/route.ts",
  "utf8",
);
const microsoftStatus = fs.readFileSync(
  "src/app/api/v1/connectors/microsoft-365/status/route.ts",
  "utf8",
);
const mailboxPage = fs.readFileSync(
  "src/app/(shell)/apps/communications/mailboxes/page.tsx",
  "utf8",
);

test("mailbox OAuth session resolution is Platform Core only", () => {
  for (const route of [gmailConnect, microsoftConnect, gmailCallback, microsoftCallback]) {
    assert.doesNotMatch(route, /fetchPortalMe/);
    assert.doesNotMatch(route, /portal\?\.org_name/);
    assert.match(route, /resolveActivePlatformSession\(\{/);
  }
});

test("mailbox OAuth connection requires organisation settings authority", () => {
  for (const route of [gmailConnect, microsoftConnect]) {
    assert.match(route, /requirePermission\(session, \{/);
    assert.match(route, /module: "settings"/);
    assert.match(route, /action: "manage"/);
    assert.match(route, /scope: "organisation"/);
    assert.ok(
      route.indexOf("requirePermission(session") < route.indexOf("createGoogleOAuthState("),
    );
  }
});

test("OAuth callbacks reauthorise the actor before token persistence", () => {
  for (const [route, saveCall] of [
    [gmailCallback, "saveOrgGoogleGmailConnectorTokens("],
    [microsoftCallback, "saveOrgMicrosoft365ConnectorTokens("],
  ]) {
    assert.match(route, /const \{ userId \} = await auth\(\)/);
    assert.match(route, /session\.organisationId !== organisationId/);
    assert.match(route, /requirePermission\(session, \{/);
    assert.ok(route.indexOf("await auth()") < route.indexOf(saveCall));
    assert.ok(route.indexOf("requirePermission(session") < route.indexOf(saveCall));
  }
});

test("mailbox status endpoints require Communications read authority", () => {
  for (const route of [gmailStatus, microsoftStatus]) {
    assert.match(route, /requireFeature\(session, "communications\.read"\)/);
    assert.ok(
      route.indexOf('requireFeature(session, "communications.read")') <
        route.indexOf("ConnectorTokens(session.organisationId)"),
    );
  }
});

test("mailbox SSR surface requires Communications read authority", () => {
  assert.match(
    mailboxPage,
    /getAuthorisedPlatformPageSession\("communications\.read"\)/,
  );
});

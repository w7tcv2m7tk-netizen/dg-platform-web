import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "src/app/(shell)/dashboard/settings/audit/page.tsx",
  "utf8",
);
const api = fs.readFileSync("src/app/api/v1/audit/route.ts", "utf8");

test("audit page requires org-admin authority before loading logs", () => {
  const body = page.slice(page.indexOf("export default async function"));
  assert.match(body, /getPlatformPageContext\(/);
  assert.match(body, /sessionCanViewOrgAudit\(session\)/);
  assert.ok(
    body.indexOf("sessionCanViewOrgAudit(session)") < body.indexOf("listAuditLogs("),
  );
  assert.doesNotMatch(page, /resolveActivePlatformSession/);
  assert.match(page, /module:\s*"team"/);
  assert.match(page, /action:\s*"manage"/);
  assert.match(page, /scope:\s*"organisation"/);
});

test("audit API no longer uses CRM contact read as a proxy", () => {
  assert.match(api, /requireOrgAdmin\(session\)/);
  assert.doesNotMatch(api, /crm\.contacts\.read/);
  assert.ok(
    api.indexOf("requireOrgAdmin(session)") < api.indexOf("listAuditLogs("),
  );
});

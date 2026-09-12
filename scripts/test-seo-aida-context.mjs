import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/app/api/v1/ai/advisor/route.ts", "utf8");
const panel = readFileSync("src/components/seo/SeoAuditPanel.tsx", "utf8");
const advisor = readFileSync(
  "packages/platform-core/src/advisor/ask-advisor.ts",
  "utf8",
);

test("SEO Aida hand-off retrieves persisted organisation evidence on the server", () => {
  const authIndex = route.indexOf("requirePlatformAuth(req)");
  const auditIndex = route.indexOf(
    "scoresFromLatestSeoAudit(session.organisationId)",
  );

  assert.ok(authIndex >= 0, "Advisor route must authenticate the request");
  assert.ok(
    auditIndex > authIndex,
    "SEO evidence must be selected after authentication for the session organisation",
  );
  assert.match(route, /contextLabel === "SEO"/);
  assert.match(route, /additionalEvidence,/);
});

test("SEO audit asks Aida through the existing Advisor boundary", () => {
  assert.match(panel, /fetch\("\/api\/v1\/ai\/advisor"/);
  assert.match(panel, /contextLabel: "SEO"/);
  assert.match(panel, /latest persisted SEO audit/);
});

test("Advisor includes App evidence in model and fallback answers", () => {
  assert.match(advisor, /Context-specific evidence \(server-selected\)/);
  assert.match(advisor, /Context evidence:/);
});

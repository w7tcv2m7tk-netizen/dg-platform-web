import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync(
  new URL("../src/components/seo/SeoAuditPanel.tsx", import.meta.url),
  "utf8",
);

test("a saved SEO audit can be re-run against its original URL", () => {
  assert.match(panel, /async function runAudit\(overrideUrl\?: string\)/);
  assert.match(panel, /onClick=\{\(\) => void runAudit\(auditedUrl\)\}/);
  assert.match(panel, /aria-label=\{`Re-audit \$\{auditedUrl\}`\}/);
});

test("history re-audit is a touch-sized non-form action", () => {
  assert.match(panel, /type="button"[\s\S]*?min-h-11[\s\S]*?Audit again/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.join(__dirname, "../.github/workflows/final-security-certification.yml");

test("final security workflow retains all certification regressions", async () => {
  const source = await readFile(workflowPath, "utf8");
  for (const filename of [
    "test-feature-tail-authority.mjs",
    "test-residual-relationship-isolation.mjs",
    "test-review-request-contact-isolation.mjs",
    "test-notification-recipient-isolation.mjs",
    "test-final-permission-matrix.mjs",
  ]) {
    assert.match(source, new RegExp(filename.replaceAll(".", "\\.")));
  }
});

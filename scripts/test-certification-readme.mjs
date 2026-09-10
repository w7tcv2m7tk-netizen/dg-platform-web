import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("final security certification remains non-mutating by design", async () => {
  const source = await readFile(path.join(__dirname, "../docs/FINAL-SECURITY-CERTIFICATION.md"), "utf8");
  assert.match(source, /read-only with respect to production data/i);
  assert.match(source, /does not mutate Neon/i);
});

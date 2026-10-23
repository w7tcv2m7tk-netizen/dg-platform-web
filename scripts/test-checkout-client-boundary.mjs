import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? javascriptFiles(target) : target.endsWith(".js") ? [target] : [];
  });
}

test("production browser bundles exclude the checkout coordinator", () => {
  // Check actual production artifacts: source graph/tree-shaking assumptions alone
  // missed a client-reachable coordinator through the platform-core barrel.
  const browser = javascriptFiles(".next/static");
  const server = javascriptFiles(".next/server");
  assert.ok(browser.length > 0 && server.length > 0, "Run npx next build before this check");
  const markers = ["checkout_lease_lost", "stripe_outcome_unknown", "idempotency_window_elapsed"];
  for (const file of browser) {
    const source = readFileSync(file, "utf8");
    for (const marker of markers) assert.ok(!source.includes(marker), `Server checkout code in browser artifact: ${file} (${marker})`);
  }
  assert.ok(server.some(file => readFileSync(file, "utf8").includes("checkout_lease_lost")), "The server build must include the coordinator");
});

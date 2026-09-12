import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const manifestPath = "packages/platform-core/src/apps/builtins/command-centre.ts";
const manifest = read(manifestPath);
const catchAll = read("src/app/(shell)/command/[[...segments]]/page.tsx");

function commandRoutes() {
  return [...manifest.matchAll(/path:\s*"(\/command(?:\/[^"]*)?)"/g)].map((match) => match[1]);
}

test("every declared Command Centre route resolves to a real page", () => {
  const routes = commandRoutes();
  assert.ok(routes.length > 10, "expected the Command Centre manifest route catalogue");

  for (const route of routes) {
    if (route === "/command") continue;
    const page = path.join(root, "src/app/(shell)", route, "page.tsx");
    assert.equal(
      fs.existsSync(page),
      true,
      `${route} is declared in the Command Centre manifest but has no dedicated page`,
    );
  }
});

test("unknown Command routes fail closed instead of rendering product placeholders", () => {
  assert.match(catchAll, /notFound\(\)/);
  assert.doesNotMatch(catchAll, /AppFeaturePlaceholder/);
  assert.doesNotMatch(catchAll, /return\s*<AppFeaturePlaceholder/);
});

test("Command ops home never exposes deployment setup instructions to operators", () => {
  assert.doesNotMatch(catchAll, /npm run db:push/);
  assert.doesNotMatch(catchAll, /Set\s*<code[^>]*>DATABASE_URL/);
  assert.match(catchAll, /temporarily unavailable/);
});

test("Command overview navigation meets the native touch-target floor", () => {
  assert.match(catchAll, /min-h-11/);
});

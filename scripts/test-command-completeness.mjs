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

test("core Command pages use operational recovery instead of developer database copy", () => {
  const pages = [
    "src/app/(shell)/command/[[...segments]]/page.tsx",
    "src/app/(shell)/command/advisor/page.tsx",
    "src/app/(shell)/command/platform-health/page.tsx",
    "src/app/(shell)/command/opportunities/page.tsx",
    "src/app/(shell)/command/reports/page.tsx",
    "src/app/(shell)/command/revenue/page.tsx",
  ];

  for (const rel of pages) {
    const source = read(rel);
    assert.doesNotMatch(source, /Database not configured/i, `${rel} leaks developer database state`);
    assert.doesNotMatch(source, /npm run db:push/, `${rel} leaks deployment instructions`);
    assert.doesNotMatch(source, />[^<]*DATABASE_URL[^<]*</, `${rel} renders an environment variable name`);
  }

  const recovery = read("src/components/command/OperatorDataUnavailable.tsx");
  assert.match(recovery, /temporarily unavailable/i);
  assert.match(recovery, /min-h-11/);
});

test("Command operator status UI avoids source-code and deferred-route language", () => {
  const status = read("src/components/command/CommandBetaStatus.tsx");
  assert.doesNotMatch(status, /docs\/COMMAND-CENTRE-BETA\.md/);
  assert.doesNotMatch(status, /Deferred Command modules|redirect only/i);
  assert.match(status, /min-h-11/);
});

test("primary Command actions meet the native touch-target floor", () => {
  const files = [
    "src/app/(shell)/command/[[...segments]]/page.tsx",
    "src/app/(shell)/command/opportunities/page.tsx",
    "src/app/(shell)/command/reports/page.tsx",
    "src/app/(shell)/command/revenue/page.tsx",
    "src/components/command/CommandBetaStatus.tsx",
    "src/components/command/OperatorDataUnavailable.tsx",
  ];

  for (const rel of files) {
    assert.match(read(rel), /min-h-11/, `${rel} should expose native-sized operator actions`);
  }
});

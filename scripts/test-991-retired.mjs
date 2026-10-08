import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

test("retired reconciliation has no application route, core or fixture import", () => {
  for (const file of ["src/lib/reconcile-991.ts", "src/app/api/admin/reconcile-991/route.ts",
    "src/app/(shell)/command/reconcile-991/page.tsx", "src/app/(shell)/command/reconcile-991/actions.ts",
    "src/app/(shell)/command/reconcile-991/Reconcile991Form.tsx"]) assert.equal(existsSync(file), false);
  const inspect = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (/\.[cm]?[jt]sx?$/.test(file)) {
        assert.doesNotMatch(readFileSync(file, "utf8"), /DG_RECONCILE_991|handleReconcile991|fixtures\/reconcile-991|\/api\/admin\/reconcile-991/,
          `retired execution dependency in ${file}`);
      }
    }
  };
  inspect("src");
});

test("historical fixture refuses imports outside the owned test runner and on Vercel", () => {
  const cases = [{}, {
    DATABASE_URL: "postgresql://test@127.0.0.1:1/dg_991_test",
    DG_RECONCILE_TEST_MARKER: "00000000-0000-4000-8000-000000000000",
    VERCEL: "1",
  }];
  for (const env of cases) {
    const result = spawnSync(process.execPath, ["--conditions=react-server", "--experimental-strip-types",
      "--import", "./scripts/register-ts-resolver.mjs", "--input-type=module", "-e",
      'await import("./scripts/fixtures/reconcile-991.ts")'], {
      env: { PATH: process.env.PATH, ...env }, encoding: "utf8", timeout: 10000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Historical reconciliation fixture requires an isolated test database/);
  }
});

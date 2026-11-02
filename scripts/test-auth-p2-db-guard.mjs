import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("direct auth DB execution fails closed without a disposable marker", () => {
  const childEnv = {
    ...process.env,
    DATABASE_URL: "postgresql://checkout_test@127.0.0.1:1/dg_checkout_test",
    DG_CHECKOUT_DB_MARKER: "",
  };
  delete childEnv.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["--conditions=react-server", "--experimental-strip-types", "--import", "./scripts/register-ts-resolver.mjs", "--test", "scripts/test-auth-p2-db.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: childEnv,
  });
  assert.notEqual(result.status, 0, "direct execution without a marker must fail");
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, /disposable PostgreSQL marker|disposable DATABASE_URL/);
});

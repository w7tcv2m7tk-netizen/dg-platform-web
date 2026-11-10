import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/app/api/health/db/route.ts", import.meta.url),
  "utf8",
);

test("database health endpoint does not expose raw errors", () => {
  assert.match(source, /code:\s*"database_unreachable"/);
  assert.match(source, /code:\s*"missing_database_url"/);
  assert.match(source, /code:\s*"up"/);
  assert.doesNotMatch(source, /message:\s*(brief|message|err)/);
  assert.doesNotMatch(source, /err\.message/);
  assert.doesNotMatch(source, /message\.split/);
  assert.match(source, /\{\s*status:\s*503\s*\}/);
});

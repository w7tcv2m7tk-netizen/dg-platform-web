import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("post-login home is role-aware for operators and customers", async () => {
  const [routes, home, resolver] = await Promise.all([
    readFile("src/lib/auth-routes.ts", "utf8"),
    readFile("src/app/home/page.tsx", "utf8"),
    readFile("src/lib/auth-home.ts", "utf8"),
  ]);

  assert.match(routes, /AUTH_AFTER_SIGN_IN_URL = "\/home"/);
  assert.match(home, /resolveAuthenticatedHome/);
  assert.match(resolver, /operator \? "\/command" : "\/dashboard"/);
});

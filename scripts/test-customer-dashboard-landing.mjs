import fs from "node:fs";
import assert from "node:assert/strict";

const dashboard = fs.readFileSync("src/app/(shell)/dashboard/page.tsx", "utf8");
const authRoutes = fs.readFileSync("src/lib/auth-routes.ts", "utf8");
const postLogin = fs.readFileSync("src/app/post-login/page.tsx", "utf8");

assert.match(authRoutes, /AUTH_AFTER_SIGN_IN_URL = "\/post-login"/);
assert.match(postLogin, /operator \? "\/command" : "\/dashboard"/);
assert.doesNotMatch(dashboard, /redirect\("\/command"\)/);
assert.match(dashboard, /BusinessOverviewDashboard/);
console.log("role-aware dashboard landing regression passed");

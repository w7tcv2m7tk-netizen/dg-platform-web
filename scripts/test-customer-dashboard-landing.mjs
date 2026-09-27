import fs from "node:fs";
import assert from "node:assert/strict";

const dashboard = fs.readFileSync("src/app/(shell)/dashboard/page.tsx", "utf8");
const authRoutes = fs.readFileSync("src/lib/auth-routes.ts", "utf8");

assert.match(authRoutes, /AUTH_AFTER_SIGN_IN_URL = "\/dashboard"/);
assert.doesNotMatch(dashboard, /redirect\("\/command"\)/);
assert.doesNotMatch(dashboard, /getPlatformOperatorContext/);
assert.match(dashboard, /BusinessOverviewDashboard/);
console.log("customer dashboard landing regression passed");

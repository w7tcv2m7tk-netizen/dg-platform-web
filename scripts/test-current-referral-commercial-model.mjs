import fs from "node:fs";
import assert from "node:assert/strict";

const referrals = fs.readFileSync("packages/platform-core/src/partners/referrals-workspace.ts","utf8");
const commissions = fs.readFileSync("packages/platform-core/src/partners/commissions-workspace.ts","utf8");
const dashboard = fs.readFileSync("src/components/partners/PartnerProgrammeDashboard.tsx","utf8");
const programme = fs.readFileSync("packages/platform-core/src/partners/programme.ts","utf8");

assert.doesNotMatch(referrals, /Founding 100:/);
assert.doesNotMatch(referrals, /Founding 1,000\+:/);
assert.match(referrals, /Standard direct referral/);
assert.doesNotMatch(commissions, /Founding 100:/);
assert.doesNotMatch(commissions, /Founding 1,000\+:/);
assert.doesNotMatch(dashboard, /Founding 10 \/ 100 \/ 1,000\+/);
assert.match(programme, /Industry App subscription fees actually received \(\$149\/mo\)/);
assert.match(programme, /Standard direct referral/);

console.log("current referral commercial model checks passed");

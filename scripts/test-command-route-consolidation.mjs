import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const redirects = new Map([
  ["src/app/(shell)/command/commissions/pending/page.tsx", "/command/commissions"],
  ["src/app/(shell)/command/commissions/approved/page.tsx", "/command/commissions"],
  ["src/app/(shell)/command/commissions/paid/page.tsx", "/command/commissions"],
  ["src/app/(shell)/command/referrals/pending/page.tsx", "/command/referrals"],
  ["src/app/(shell)/command/referrals/converted/page.tsx", "/command/referrals"],
  ["src/app/(shell)/command/partners/onboarding/page.tsx", "/command/delivery/onboarding"],
]);

for (const [route, destination] of redirects) {
  test(`${route} is compatibility-only and redirects to its canonical owner`, () => {
    const source = fs.readFileSync(route, "utf8");
    assert.match(source, new RegExp(`redirect\\(\"${destination.replaceAll("/", "\\/")}\"\\)`));
    assert.doesNotMatch(source, /listAllCommissions|listAllReferrals|CustomerOnboardingWorkflow/);
  });
}

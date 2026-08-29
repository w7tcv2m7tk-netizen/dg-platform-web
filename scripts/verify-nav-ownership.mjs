/**
 * Assert nav chrome ownership (self-contained — no package import graph).
 * Usage: node scripts/verify-nav-ownership.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const platformTools = readFileSync(
  join(root, "packages/platform-core/src/apps/platform-tools.ts"),
  "utf8",
);
const activeNav = readFileSync(
  join(root, "packages/platform-core/src/apps/active-nav.ts"),
  "utf8",
);
const navigation = readFileSync(
  join(root, "packages/platform-core/src/apps/navigation.ts"),
  "utf8",
);

let failed = 0;

function assert(ok, msg) {
  if (ok) console.log(`OK   ${msg}`);
  else {
    failed += 1;
    console.error(`FAIL ${msg}`);
  }
}

assert(
  !/path:\s*"\/dashboard\/settings\/organisation"/.test(platformTools),
  "Settings routes do not include /dashboard/settings/organisation",
);
assert(
  !/label:\s*"Organisation"/.test(platformTools),
  "Settings routes do not label a tab Organisation",
);
assert(
  !/matchAlso:\s*\[[^\]]*\/dashboard\/business/.test(platformTools),
  "Settings does not matchAlso /dashboard/business",
);
assert(
  /path:\s*"\/dashboard\/business",\s*label:\s*"Business Profile"/.test(navigation),
  "Business nav owns Business Profile at /dashboard/business",
);
assert(
  /path:\s*"\/dashboard\/team",\s*label:\s*"Team"/.test(navigation),
  "Business nav owns Team at /dashboard/team",
);
assert(
  /1_000_000\s*\+\s*bestPrimary/.test(activeNav),
  "matchSpecificity prefers primary path ownership over matchAlso",
);
assert(
  /bestAlias/.test(activeNav) && /matched alias length|alias length/.test(activeNav),
  "matchSpecificity scores alias length separately from declared path",
);
assert(
  /path:\s*"\/command",\s*label:\s*"Priorities",\s*exact:\s*true/.test(navigation),
  "Command Centre Priorities is exact-only (does not steal /command/docs)",
);
assert(
  /href:\s*"\/command\/docs"[\s\S]*?label:\s*"Platform Docs"[\s\S]*?path:\s*"\/command\/docs"/.test(
    navigation,
  ),
  "Platform Docs trailing link owns /command/docs",
);
assert(
  !/operatorApp\(\s*"dg-sales"/.test(navigation),
  "DigitalGate primary nav does not include Sales (dg-sales)",
);
assert(
  /name:\s*"Prospecting"/.test(navigation) &&
    /path:\s*"\/apps\/prospecting\/discovery",\s*label:\s*"Business Discovery"/.test(navigation),
  "Prospecting owns acquisition subnav (Business Discovery)",
);
assert(
  /path:\s*"\/apps\/communications",\s*label:\s*"Overview"/.test(navigation),
  "Communications starts with Overview",
);
assert(
  /path:\s*"\/dashboard\/health",\s*label:\s*"Health"/.test(navigation),
  "Business owns Health (Intelligence absorbed)",
);
assert(
  !/id:\s*"intelligence",\s*\n\s*name:\s*"Intelligence"/.test(navigation) ||
    /Intelligence is absorbed into Business/.test(navigation),
  "Intelligence is not a separate CORE sidebar destination",
);
assert(
  !/\.\.\.\(foundingCustomerMode \? \[\] : \[intelligenceNavItem\(\)\]\)/.test(navigation),
  "coreApps no longer injects intelligenceNavItem()",
);

const orgPage = readFileSync(
  join(root, "src/app/(shell)/dashboard/settings/organisation/page.tsx"),
  "utf8",
);
assert(
  /redirect\(\s*"\/dashboard\/business"\s*\)/.test(orgPage),
  "legacy Settings Organisation redirects to Business Profile",
);

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nOK — nav ownership assertions passed");

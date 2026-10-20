import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const industryTitle = read("src/components/industry/IndustryAppTitle.tsx");
const scaffold = read("src/components/business-apps/BusinessAppScaffoldPage.tsx");
const identity = read("src/components/industry/IndustrySectionIdentity.tsx");
const betaLayout = read("src/components/industry/IndustryBetaAppLayout.tsx");

assert.match(industryTitle, /AppPageHeader/);
assert.match(industryTitle, /family=\{eyebrow \?\? "Industry App"\}/);
assert.match(scaffold, /resolveSelectedIndustryIdentity/);
assert.match(betaLayout, /resolveSelectedIndustryIdentity/);
assert.match(scaffold, /SectionPageHeader/);
assert.match(identity, /SectionPageHeader/);
assert.match(betaLayout, /IndustrySectionIdentity/);

// Standard/current and future Industry Apps inherit the same identity through the shared beta layout.
for (const mount of ["re", "accommodation", "automotive", "creator", "finance", "services", "commercial", "property-management"]) {
  const layout = read(`src/app/(shell)/apps/${mount}/layout.tsx`);
  assert.match(layout, /IndustryBetaAppLayout/, `${mount} must inherit the canonical Industry App layout contract`);
}

assert.match(read("src/app/(shell)/apps/re/layout.tsx"), /appId="real-estate"/);

console.log("Platform page hierarchy contract checks passed");

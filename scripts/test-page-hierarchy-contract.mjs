import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const industryTitle = read("src/components/industry/IndustryAppTitle.tsx");
const scaffold = read("src/components/business-apps/BusinessAppScaffoldPage.tsx");
const identity = read("src/components/industry/IndustrySectionIdentity.tsx");
const betaLayout = read("src/components/industry/IndustryBetaAppLayout.tsx");

assert.match(industryTitle, /AppPageHeader/);
assert.match(industryTitle, /family="Industry App"/);
assert.match(scaffold, /SectionPageHeader/);
assert.match(identity, /SectionPageHeader/);
assert.match(betaLayout, /IndustrySectionIdentity/);

// Custom Industry Apps may own their layout, but must apply the shared identity directly.
for (const mount of ["re", "accommodation"]) {
  const layout = read(`src/app/(shell)/apps/${mount}/layout.tsx`);
  assert.match(layout, /IndustrySectionIdentity/, `${mount} must apply the canonical Industry App identity`);
}

// Standard/current and future Industry Apps inherit the same identity through the shared beta layout.
for (const mount of ["finance", "services", "commercial", "property-management", "automotive", "creator"]) {
  const layout = read(`src/app/(shell)/apps/${mount}/layout.tsx`);
  assert.match(layout, /IndustryBetaAppLayout/, `${mount} must inherit the canonical Industry App layout contract`);
}

console.log("Platform page hierarchy contract checks passed");

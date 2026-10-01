import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const industryTitle = read("src/components/industry/IndustryAppTitle.tsx");
const scaffold = read("src/components/business-apps/BusinessAppScaffoldPage.tsx");
const identity = read("src/components/industry/IndustrySectionIdentity.tsx");

assert.match(industryTitle, /AppPageHeader/);
assert.match(industryTitle, /family="Industry App"/);
assert.match(scaffold, /SectionPageHeader/);
assert.match(identity, /SectionPageHeader/);

for (const mount of ["re", "accommodation", "finance", "services", "commercial", "property-management", "automotive", "creator"]) {
  const layout = read(`src/app/(shell)/apps/${mount}/layout.tsx`);
  assert.match(layout, /IndustrySectionIdentity/, `${mount} must inherit the canonical Industry App sub-page hierarchy`);
}

console.log("Platform page hierarchy contract checks passed");

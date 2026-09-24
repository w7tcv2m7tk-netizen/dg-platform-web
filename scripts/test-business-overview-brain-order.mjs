import fs from "node:fs";
import assert from "node:assert/strict";

const nav = fs.readFileSync("src/components/navigation/AppContextNav.tsx", "utf8");
assert.match(nav, /const routePath = \(value: string\) => value\.split\("\?"\)\[0\]/);
assert.match(nav, /routePath\(route\.path\) === "\/dashboard"/);
assert.match(nav, /overviewIndex \+ 1/);
console.log("Business Overview / Brain order regression checks passed");

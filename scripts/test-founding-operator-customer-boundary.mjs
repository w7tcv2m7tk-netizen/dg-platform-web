import fs from "node:fs";import assert from "node:assert/strict";
const actions=fs.readFileSync("src/components/founding/FoundingStageActions.tsx","utf8");assert.doesNotMatch(actions,/Open customer setup/);assert.match(actions,/Customer setup is customer-only/);
for(const path of ["src/app/(shell)/founding/setup/page.tsx","src/app/(shell)/founding/agreement/page.tsx"]){const s=fs.readFileSync(path,"utf8");assert.match(s,/canAccessCommandCentre/);const guard=s.indexOf("if (operator && invite)");const claim=s.indexOf("claimFoundingInvite({",guard);assert.ok(guard>=0&&claim>guard,path+" must block operator before claim");}
console.log("founding operator/customer boundary: ok");

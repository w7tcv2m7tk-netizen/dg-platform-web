import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { getCategorizedPlatformNavigation } from "../packages/platform-core/src/apps/navigation.ts";
import { filterNavigationByAccess } from "../packages/platform-core/src/access/nav-filter.ts";
import { buildAccessContext, sessionCan } from "../packages/platform-core/src/access/evaluate.ts";

function navigation(role, grants) {
  return filterNavigationByAccess(getCategorizedPlatformNavigation([]),
    buildAccessContext({ role, organisationId: "fixture-org", principalId: "user_fixture", grants, enabledAppIds: [] }));
}

test("restricted member keeps only the Settings overview without billing or admin grants", () => {
  const nav = navigation("member");
  const settings = nav.ia.platformAdmin.apps.find(app => app.id === "platform-settings");
  assert.ok(settings);
  assert.deepEqual(settings.routes.map(route => route.path), ["/dashboard/settings"]);
  assert.equal(settings.primaryHref, "/dashboard/settings");
  const member = { role: "member", organisationId: "fixture-org" };
  assert.equal(sessionCan(member, { module: "billing", action: "view", scope: "organisation" }), false);
  assert.equal(sessionCan(member, { module: "settings", action: "manage", scope: "organisation" }), false);
});

test("owner retains existing settings routes", () => {
  const settings = navigation("owner").ia.platformAdmin.apps.find(app => app.id === "platform-settings");
  assert.ok(settings.routes.some(route => route.path.endsWith("/billing")));
  assert.ok(settings.routes.some(route => route.path.endsWith("/connected-services")));
});

async function pageLinks(role) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "next/link": { default: "link", __esModule: true },
    "@dg/platform-core": { getOrganisationBusinessProfile: async () => ({ businessName: "Synthetic fixture" }), sessionCan },
    "@/lib/org-apps": {
      getPlatformPageContext: async () => ({ session: { role, organisationId: "fixture-org", organisationName: "Synthetic fixture" }, portal: {}, email: "synthetic@example.invalid" }),
      getOrgEnabledAppIds: async () => [],
    },
    "@/components/settings/AppearanceSettings": { AppearanceSettings: "appearance" },
    "@/components/ui/SectionPageHeader": { SectionPageHeader: "header" },
    "@/components/platform/BusinessProfileCard": { BusinessProfileCard: "profile" },
  };
  const source = fs.readFileSync("src/app/(shell)/dashboard/settings/page.tsx", "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), `Unexpected import ${name}`);
    return modules[name];
  } });
  const links = [];
  let appearance = false;
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    if (node.type === "appearance") appearance = true;
    if (node.props?.href) links.push(node.props.href);
    visit(node.props?.children);
  }
  visit(await exports.default());
  return { links, appearance };
}

test("actual Settings page exposes personal preferences but no administrative cards to member", async () => {
  const { links, appearance } = await pageLinks("member");
  assert.equal(appearance, true);
  for (const path of ["/dashboard/settings/billing", "/dashboard/settings/connected-services", "/dashboard/settings/referrals", "/dashboard/apps"]) {
    assert.equal(links.includes(path), false, path);
  }
  assert.ok(links.includes("/support"));
  assert.ok(links.includes("/dashboard/team"), "Member keeps existing read-only team visibility");
});

test("actual Settings page retains owner billing and administration links", async () => {
  const { links } = await pageLinks("owner");
  for (const path of ["/dashboard/settings/billing", "/dashboard/settings/connected-services", "/dashboard/team", "/dashboard/apps"]) {
    assert.ok(links.includes(path), path);
  }
});

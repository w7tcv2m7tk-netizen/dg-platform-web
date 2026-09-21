import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const MARKETING = path.join(ROOT, "marketing", "pages");
const CANONICAL_SIGNUP = "https://app.digitalgate.com.au/signup/account";
const LEGACY_PUBLIC_ONBOARDING = "https://app.digitalgate.com.au/onboarding";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const marketingFiles = walk(MARKETING).filter((file) => /\.(?:html|mjs|js|ts|tsx)$/.test(file));

test("public marketing never links directly to app onboarding", () => {
  const offenders = marketingFiles.filter((file) => fs.readFileSync(file, "utf8").includes(LEGACY_PUBLIC_ONBOARDING));
  assert.deepEqual(offenders, [], `Public trial CTAs must use ${CANONICAL_SIGNUP}; found legacy onboarding links in: ${offenders.join(", ")}`);
});

test("canonical public trial entry point remains signup/account", () => {
  const keyFiles = [
    "marketing/pages/header.html",
    "marketing/pages/footer.html",
    "marketing/pages/homepage.html",
    "marketing/pages/pricing-page.html",
    "marketing/pages/apps/build.mjs",
    "marketing/pages/growth-landings/build.mjs",
  ];
  for (const relative of keyFiles) {
    const content = fs.readFileSync(path.join(ROOT, relative), "utf8");
    assert.ok(content.includes(CANONICAL_SIGNUP), `${relative} must contain the canonical public signup URL`);
  }
});

test("Industry App commercial pricing remains $149, not $99", () => {
  const catalog = fs.readFileSync(path.join(ROOT, "marketing/pages/apps/catalog.mjs"), "utf8");
  const pricing = fs.readFileSync(path.join(ROOT, "marketing/pages/pricing-page.html"), "utf8");
  const terms = fs.readFileSync(path.join(ROOT, "marketing/pages/founding-customer-terms.html"), "utf8");

  assert.match(catalog, /Industry Apps are specialist operating capability \(\+\$149\/mo\)/);
  assert.match(pricing, /Industry Apps \$149\/mo with one primary sub-industry included/);
  assert.match(terms, /Industry Apps are currently <strong>\$149\/month<\/strong> each/);

  const forbidden = [
    /Industry Apps? (?:are )?(?:currently )?<strong>\$99/i,
    /Industry Apps? \$99/i,
    /Industry \+\$99/i,
    /Industry \(\+\$99\/mo/i,
    /Industry App <strong>\$99<\/strong>/i,
  ];
  for (const file of marketingFiles) {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of forbidden) {
      assert.doesNotMatch(content, pattern, `Industry pricing regression in ${path.relative(ROOT, file)}: ${pattern}`);
    }
  }
});

test("legitimate $99 products remain allowed", () => {
  const pricing = fs.readFileSync(path.join(ROOT, "marketing/pages/pricing-page.html"), "utf8");
  assert.match(pricing, /Starter \$99/);
  assert.match(pricing, /Advertising \$99/);
  assert.match(pricing, /Marketing \$99/);
});

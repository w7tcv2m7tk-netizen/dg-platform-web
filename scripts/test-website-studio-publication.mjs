import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { sanitisePublicCss, sanitisePublicHtml } from "../src/lib/public-html.ts";
import { canRenderStudioContent } from "../src/lib/website-studio-publication.ts";

test("published site and published page render publicly", () => {
  assert.equal(canRenderStudioContent({ siteStatus: "published", pageStatus: "published", previewRequested: false, previewAuthorised: false }), true);
});

test("draft site never becomes public from an unauthorised preview query", () => {
  assert.equal(canRenderStudioContent({ siteStatus: "draft", pageStatus: "draft", previewRequested: true, previewAuthorised: false }), false);
});

test("draft page on a published site remains private", () => {
  assert.equal(canRenderStudioContent({ siteStatus: "published", pageStatus: "draft", previewRequested: false, previewAuthorised: false }), false);
});

test("unauthorised preview does not expose a draft page on a published site", () => {
  assert.equal(canRenderStudioContent({ siteStatus: "published", pageStatus: "draft", previewRequested: true, previewAuthorised: false }), false);
});

test("authorised Studio preview can render unpublished content", () => {
  assert.equal(canRenderStudioContent({ siteStatus: "draft", pageStatus: "draft", previewRequested: true, previewAuthorised: true }), true);
});

test("preview authorisation alone cannot expose drafts without an explicit preview request", () => {
  assert.equal(canRenderStudioContent({ siteStatus: "draft", pageStatus: "draft", previewRequested: false, previewAuthorised: true }), false);
});

test("unauthorised preview query still permits already-published content", () => {
  assert.equal(canRenderStudioContent({ siteStatus: "published", pageStatus: "published", previewRequested: true, previewAuthorised: false }), true);
});

test("public metadata uses the same publication gate and carries noindex", async () => {
  for (const path of [
    "src/app/sites/[slug]/page.tsx",
    "src/app/sites/[slug]/[pageSlug]/page.tsx",
  ]) {
    const source = await readFile(path, "utf8");
    const metadataSource = source.slice(
      source.indexOf("export async function generateMetadata"),
      source.indexOf("export default async function"),
    );
    assert.match(metadataSource, /await searchParams/);
    assert.match(metadataSource, /canPreviewWebsiteOrganisation/);
    assert.match(metadataSource, /canRenderStudioContent/);
    assert.match(metadataSource, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
    assert.match(metadataSource, /noindex:/);
  }
});

test("public sitemap never falls back to an unpublished site", async () => {
  const source = await readFile("src/app/sites/seo/sitemap/route.ts", "utf8");
  assert.match(source, /getWebsiteBySlug\(slug, \{ publishedOnly: true \}\)/);
  assert.doesNotMatch(source, /\|\|\s*\(await getWebsiteBySlug\(slug\)\)/);
});

test("public HTML sanitizer removes executable elements and event handlers", () => {
  const dirty = '<div onclick="alert(1)"><script>alert(2)</script><img src="/ok.webp" onerror="alert(3)"><iframe src="https://evil.test"></iframe><p>Safe content</p></div>';
  const safe = sanitisePublicHtml(dirty);
  assert.doesNotMatch(safe, /<script/i);
  assert.doesNotMatch(safe, /<iframe/i);
  assert.doesNotMatch(safe, /\sonclick=/i);
  assert.doesNotMatch(safe, /\sonerror=/i);
  assert.match(safe, /Safe content/);
  assert.match(safe, /src="\/ok\.webp"/);
});

test("public HTML sanitizer blocks encoded and direct executable URL schemes", () => {
  const dirty = '<a href="java&#x73;cript:alert(1)">bad</a><img src="data:text/html;base64,PHNjcmlwdD4="><a href="/safe">safe</a><a href="mailto:hello@digitalgate.com.au">mail</a>';
  const safe = sanitisePublicHtml(dirty);
  assert.doesNotMatch(safe, /javascript:/i);
  assert.doesNotMatch(safe, /data:text\/html/i);
  assert.match(safe, /href="\/safe"/);
  assert.match(safe, /href="mailto:hello@digitalgate\.com\.au"/);
});

test("public HTML sanitizer removes imported form submission authority", () => {
  const safe = sanitisePublicHtml('<form action="https://legacy.example/wp-json/x"><button formaction="https://legacy.example/other">Send</button></form>');
  assert.doesNotMatch(safe, /\saction=/i);
  assert.doesNotMatch(safe, /\sformaction=/i);
});

test("public CSS sanitizer removes legacy executable CSS primitives", () => {
  const safe = sanitisePublicCss('a{color:red;background:url(javascript:alert(1));width:expression(alert(2));behavior:url(x.htc)}');
  assert.doesNotMatch(safe, /javascript:/i);
  assert.doesNotMatch(safe, /expression\s*\(/i);
  assert.doesNotMatch(safe, /behavior\s*:/i);
  assert.match(safe, /color:red/);
});

test("page and chrome public render boundaries are wired through sanitization", async () => {
  const pageBoundary = await readFile("src/lib/public-html.ts", "utf8");
  const chromeBoundary = await readFile("src/lib/public-chrome.ts", "utf8");
  assert.match(pageBoundary, /return sanitisePublicHtml\(stripped\)/);
  assert.match(chromeBoundary, /sanitisePublicHtml\(chrome\.headerHtml/);
  assert.match(chromeBoundary, /sanitisePublicHtml\(chrome\.footerHtml/);
  assert.match(chromeBoundary, /sanitisePublicCss\(chrome\.customCss/);
});

test("Website Studio guards dirty drafts before unload and destructive navigation", async () => {
  const guard = await readFile("src/components/websites/WebsiteStudioUnsavedChangesGuard.tsx", "utf8");
  assert.match(guard, /beforeunload/);
  assert.match(guard, /window\.confirm\(LEAVE_MESSAGE\)/);
  assert.match(guard, /dataset\.unsavedChanges/);
  assert.match(guard, /requestValues\(init\.body\)/);
  assert.match(guard, /response\.ok/);
});

test("Website Studio normalises network failures into recoverable JSON errors", async () => {
  const guard = await readFile("src/components/websites/WebsiteStudioUnsavedChangesGuard.tsx", "utf8");
  assert.match(guard, /NETWORK_ERROR_MESSAGE/);
  assert.match(guard, /catch\s*\{\s*return networkFailureResponse\(\)/s);
  assert.match(guard, /status:\s*503/);
  assert.match(guard, /Content-Type\": \"application\/json/);
});

test("Website Studio page is wrapped in the unsaved-changes boundary", async () => {
  const source = await readFile("src/app/(shell)/apps/websites/studio/[id]/page.tsx", "utf8");
  assert.match(source, /WebsiteStudioUnsavedChangesGuard/);
  assert.match(source, /<WebsiteStudioUnsavedChangesGuard>/);
  assert.match(source, /<WebsiteStudioClient/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

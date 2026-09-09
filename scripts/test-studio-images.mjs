import assert from "node:assert/strict";
import test from "node:test";

import { orgOwnedAssetUrl } from "../packages/platform-core/src/assets/org-brand-storage.ts";
import {
  MAX_STUDIO_IMAGES,
  mergeStudioLibraryImages,
  parseStudioLibraryImages,
} from "../packages/platform-core/src/websites/studio-images.ts";
import { mediaAbsoluteUrl, mediaImgSnippet } from "../src/lib/studio-media.ts";

const orgId = "org_abc123";

test("orgOwnedAssetUrl accepts this organisation's Blob and public paths", () => {
  assert.equal(
    orgOwnedAssetUrl(
      `https://example.public.blob.vercel-storage.com/org-assets/${orgId}/studio-images/ab.webp`,
      orgId,
    ),
    true,
  );
  assert.equal(
    orgOwnedAssetUrl(`/org-assets/${orgId}/studio-images/ab.webp`, orgId),
    true,
  );
});

test("orgOwnedAssetUrl rejects other tenants, traversal, and platform Aida paths", () => {
  assert.equal(
    orgOwnedAssetUrl(
      `https://example.public.blob.vercel-storage.com/org-assets/other-org/studio-images/ab.webp`,
      orgId,
    ),
    false,
  );
  assert.equal(
    orgOwnedAssetUrl(`/org-assets/${orgId}/../secret/ab.webp`, orgId),
    false,
  );
  assert.equal(orgOwnedAssetUrl("/aida/aida-welcome.webp", orgId), false);
  assert.equal(orgOwnedAssetUrl("https://evil.example/x.webp", orgId), false);
});

test("parseStudioLibraryImages ignores junk and caps the library", () => {
  const parsed = parseStudioLibraryImages({
    studioImages: [
      { id: "1", label: "Hero", src: "https://cdn.example/a.webp", width: 800, height: 600, alt: "Hero" },
      { id: "", label: "skip", src: "https://cdn.example/b.webp" },
      null,
      { id: "2", label: "Patio", src: "/org-assets/org_abc123/x.jpg" },
    ],
  });
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].id, "1");
  assert.equal(parsed[1].width, 0);
});

test("mergeStudioLibraryImages preserves other organisation settings", () => {
  const next = mergeStudioLibraryImages(
    { profile: { businessName: "Roe" }, studioImages: [] },
    [
      {
        id: "1",
        label: "Hero",
        src: "https://cdn.example/a.webp",
        width: 1,
        height: 1,
        alt: "Hero",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  );
  assert.equal(next.profile.businessName, "Roe");
  assert.equal(next.studioImages.length, 1);
  assert.equal(MAX_STUDIO_IMAGES, 80);
});

test("mediaAbsoluteUrl leaves hosted URLs alone and prefixes app origin for relative paths", () => {
  assert.equal(
    mediaAbsoluteUrl("https://cdn.example/a.webp"),
    "https://cdn.example/a.webp",
  );
  assert.equal(
    mediaAbsoluteUrl("/aida/aida-welcome.webp"),
    "https://app.digitalgate.com.au/aida/aida-welcome.webp",
  );
});

test("mediaImgSnippet omits zero dimensions", () => {
  const html = mediaImgSnippet({
    id: "1",
    label: "Hero",
    src: "https://cdn.example/a.webp",
    width: 0,
    height: 0,
    alt: 'Patio "west"',
  });
  assert.equal(
    html.includes("width="),
    false,
  );
  assert.match(html, /alt="Patio &quot;west&quot;"/);
});

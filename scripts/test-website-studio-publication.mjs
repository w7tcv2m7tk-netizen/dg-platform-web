import assert from "node:assert/strict";
import test from "node:test";

import { canRenderStudioContent } from "../src/lib/website-studio-preview.ts";

test("published site and published page render publicly", () => {
  assert.equal(
    canRenderStudioContent({
      siteStatus: "published",
      pageStatus: "published",
      previewRequested: false,
      previewAuthorised: false,
    }),
    true,
  );
});

test("draft site never becomes public from an unauthorised preview query", () => {
  assert.equal(
    canRenderStudioContent({
      siteStatus: "draft",
      pageStatus: "draft",
      previewRequested: true,
      previewAuthorised: false,
    }),
    false,
  );
});

test("draft page on a published site remains private", () => {
  assert.equal(
    canRenderStudioContent({
      siteStatus: "published",
      pageStatus: "draft",
      previewRequested: false,
      previewAuthorised: false,
    }),
    false,
  );
});

test("unauthorised preview does not expose a draft page on a published site", () => {
  assert.equal(
    canRenderStudioContent({
      siteStatus: "published",
      pageStatus: "draft",
      previewRequested: true,
      previewAuthorised: false,
    }),
    false,
  );
});

test("authorised Studio preview can render unpublished content", () => {
  assert.equal(
    canRenderStudioContent({
      siteStatus: "draft",
      pageStatus: "draft",
      previewRequested: true,
      previewAuthorised: true,
    }),
    true,
  );
});

test("unauthorised preview query still permits already-published content", () => {
  assert.equal(
    canRenderStudioContent({
      siteStatus: "published",
      pageStatus: "published",
      previewRequested: true,
      previewAuthorised: false,
    }),
    true,
  );
});

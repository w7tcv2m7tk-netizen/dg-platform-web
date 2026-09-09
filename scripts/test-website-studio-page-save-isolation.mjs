import assert from "node:assert/strict";
import test from "node:test";

import {
  isolateWebsitePageComponentSnapshot,
  mergeWebsitePageSeo,
  patchWebsitePageComponentList,
} from "../packages/platform-core/src/websites/page-patch.ts";

const components = [
  { id: "hero", type: "hero", props: { heading: "Original", cta: "Book" } },
  { id: "faq", type: "faq", props: { title: "Questions", items: ["A"] } },
];

test("component patch changes only the targeted component", () => {
  const next = patchWebsitePageComponentList(components, "hero", { heading: "Updated" });
  assert.ok(next);
  assert.deepEqual(next[0].props, { heading: "Updated", cta: "Book" });
  assert.deepEqual(next[1], components[1]);
});

test("page SEO patch preserves unrelated current SEO fields", () => {
  const current = {
    title: "Fresh title",
    description: "Fresh description",
    ogImage: "https://example.com/fresh.jpg",
    showHeader: true,
    showFooter: true,
  };
  const next = mergeWebsitePageSeo(current, { showHeader: false, showFooter: false });
  assert.deepEqual(next, {
    title: "Fresh title",
    description: "Fresh description",
    ogImage: "https://example.com/fresh.jpg",
    showHeader: false,
    showFooter: false,
  });
});

test("legacy full component snapshot isolates one intended component change", () => {
  const incoming = [
    { id: "hero", type: "hero", props: { heading: "New heading", cta: "Book" } },
    components[1],
  ];
  assert.deepEqual(
    isolateWebsitePageComponentSnapshot({ current: components, incoming }),
    { componentId: "hero", props: { heading: "New heading", cta: "Book" } },
  );
});

test("legacy snapshot refuses stale multi-component replay", () => {
  const incoming = [
    { id: "hero", type: "hero", props: { heading: "My edit", cta: "Book" } },
    { id: "faq", type: "faq", props: { title: "Stale title", items: ["A"] } },
  ];
  const current = [
    components[0],
    { id: "faq", type: "faq", props: { title: "Newer title", items: ["A"] } },
  ];
  assert.equal(
    isolateWebsitePageComponentSnapshot({ current, incoming }),
    "conflict",
  );
});

test("snapshot refuses structural component replacement", () => {
  assert.equal(
    isolateWebsitePageComponentSnapshot({
      current: components,
      incoming: [components[0]],
    }),
    "conflict",
  );
});

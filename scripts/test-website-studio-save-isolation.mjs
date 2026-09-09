import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeWebsiteChromeMetadata,
  normaliseWebsiteChromePatch,
} from "../packages/platform-core/src/websites/chrome.ts";

test("normaliseWebsiteChromePatch accepts only editable chrome fields", () => {
  assert.deepEqual(
    normaliseWebsiteChromePatch({ headerHtml: "<header>new</header>" }),
    { headerHtml: "<header>new</header>" },
  );
  assert.deepEqual(
    normaliseWebsiteChromePatch({ customCss: ".hero{display:block}" }),
    { customCss: ".hero{display:block}" },
  );
  assert.equal(normaliseWebsiteChromePatch({ headerHtml: 42 }), null);
  assert.equal(normaliseWebsiteChromePatch({ unrelated: "ignored" }), null);
});

test("header save preserves footer, CSS, other chrome settings and site metadata", () => {
  const metadata = {
    generatorSource: "manual",
    chrome: {
      headerHtml: "<header>old</header>",
      footerHtml: "<footer>keep</footer>",
      customCss: ".keep{color:red}",
      logoUrl: "/logo.svg",
    },
    analytics: { enabled: true },
  };

  assert.deepEqual(
    mergeWebsiteChromeMetadata(metadata, {
      headerHtml: "<header>new</header>",
    }),
    {
      generatorSource: "manual",
      chrome: {
        headerHtml: "<header>new</header>",
        footerHtml: "<footer>keep</footer>",
        customCss: ".keep{color:red}",
        logoUrl: "/logo.svg",
      },
      analytics: { enabled: true },
    },
  );
});

test("footer and CSS patches are independently isolated", () => {
  const metadata = {
    chrome: {
      headerHtml: "header-v2",
      footerHtml: "footer-v1",
      customCss: "css-v1",
    },
  };

  const afterFooter = mergeWebsiteChromeMetadata(metadata, {
    footerHtml: "footer-v2",
  });
  assert.deepEqual(afterFooter.chrome, {
    headerHtml: "header-v2",
    footerHtml: "footer-v2",
    customCss: "css-v1",
  });

  const afterCss = mergeWebsiteChromeMetadata(afterFooter, {
    customCss: "css-v2",
  });
  assert.deepEqual(afterCss.chrome, {
    headerHtml: "header-v2",
    footerHtml: "footer-v2",
    customCss: "css-v2",
  });
});

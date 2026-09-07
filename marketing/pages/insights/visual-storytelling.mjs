/**
 * Marketing apply-script bridge for DigitalGate visual storytelling.
 *
 * Canonical render-time implementation (preferred):
 *   src/lib/digitalgate-visual-storytelling.ts
 *   src/components/websites/digitalgate-visual-storytelling-css.ts
 *
 * Website Studio HTML is enhanced at public render time so visuals remain
 * visible without requiring Neon writes. This module remains for optional
 * operator apply scripts that want to persist markup into Studio.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Ensure TS path resolution when this module is imported from scripts.
try {
  require("../../scripts/register-ts-resolver.mjs");
} catch {
  /* already registered */
}

const visual = await import(
  pathToFileURL(join(ROOT, "../../../src/lib/digitalgate-visual-storytelling.ts")).href
);

export function enhanceFoundationalInsight(html, slug) {
  return visual.enhanceDigitalgateVisualHtml(html, slug);
}

export function enhanceEditorialInsight(html, article) {
  const slug =
    article?.id === "foundational-3"
      ? "from-signal-to-action"
      : article?.id === "proactive-business-software"
        ? "business-software-should-tell-you-what-needs-doing"
        : article?.slug;
  return visual.enhanceDigitalgateVisualHtml(html, slug);
}

export const digitalgateVisualPrimitives = visual.digitalgateVisualPrimitives;

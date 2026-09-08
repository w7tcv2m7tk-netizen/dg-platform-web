import { readFileSync } from "node:fs";
import path from "node:path";

import { DgMarketingMotion } from "@/components/websites/DgMarketingMotion";
import { websiteRendererCss } from "@/components/websites/website-renderer-css";
import { enhanceDigitalgateVisualHtml } from "@/lib/digitalgate-visual-storytelling";
import { stripImportedDocumentChrome } from "@/lib/public-html";

/**
 * Isolated, noindex PREVIEW of the DigitalGate Platform Overview page.
 *
 * Renders the SAME Website Studio source of truth
 * (`marketing/pages/platform-overview.html`) through the SAME production
 * pipeline used for public pages — `enhanceDigitalgateVisualHtml` injects the
 * renderer-owned `dgpov-*` architecture visuals, `websiteRendererCss` provides
 * the storytelling styles, and `DgMarketingMotion` provides the progressive
 * reveal. It exists only so the design can be visually accepted on a real
 * Vercel preview URL before the content is published into Website Studio (Neon).
 * It does NOT own content and must never be indexed.
 */

export const PLATFORM_PREVIEW_SLUG = "platform-overview";

function loadPlatformIsland(): string {
  const file = path.join(
    process.cwd(),
    "marketing",
    "pages",
    "platform-overview.html",
  );
  const raw = readFileSync(file, "utf8");
  const body = stripImportedDocumentChrome(raw);
  const enhanced = enhanceDigitalgateVisualHtml(body, PLATFORM_PREVIEW_SLUG);
  return `<div class="wb-html-island wb-html-island--page">${enhanced}</div>`;
}

export function PlatformOverviewPreview() {
  const islandHtml = loadPlatformIsland();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: websiteRendererCss }} />
      <div dangerouslySetInnerHTML={{ __html: islandHtml }} />
      <DgMarketingMotion />
    </>
  );
}

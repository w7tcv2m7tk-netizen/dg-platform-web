/**
 * Public site chrome: hoist duplicated <style> blocks out of header/footer
 * HTML so each page ships CSS once, then render a light footer.
 */

export type PublicSiteChrome = {
  headerHtml?: string;
  footerHtml?: string;
  stylesheets?: string[];
  navLinks?: Array<{ label: string; href: string }>;
  tagline?: string;
  businessName?: string;
  overlayHeader?: boolean;
  headerLayout?: "bar" | "stacked";
  lightSurface?: boolean;
  headerCta?: { label: string; href: string; backgroundColor?: string };
  /** Hoisted CSS — render in a server <style>, do not pass to the client tree. */
  chromeCss?: string;
};

export function chromeFromSiteMetadata(
  metadata: Record<string, unknown> | null | undefined,
): PublicSiteChrome | null {
  if (!metadata || typeof metadata !== "object") return null;
  const chrome = metadata.chrome;
  if (!chrome || typeof chrome !== "object") return null;
  return chrome as PublicSiteChrome;
}

export function extractStyleBlocks(html: string): { cssBlocks: string[]; html: string } {
  const cssBlocks: string[] = [];
  const stripped = html.replace(
    /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
    (_, css: string) => {
      const trimmed = css.trim();
      if (trimmed) cssBlocks.push(trimmed);
      return "";
    },
  );
  return { cssBlocks, html: stripped };
}

function dedupeCss(blocks: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const block of blocks) {
    const key = block.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(block);
  }
  return out.join("\n");
}

/**
 * Strip inline <style> from header + footer and return one CSS blob.
 * Identical header/footer styles (common on imported chrome) are kept once.
 */
export function preparePublicChrome(
  chrome: PublicSiteChrome | null | undefined,
): PublicSiteChrome | null {
  if (!chrome) return null;
  const headerRaw = chrome.headerHtml?.trim() || "";
  const footerRaw = chrome.footerHtml?.trim() || "";
  const header = extractStyleBlocks(headerRaw);
  const footer = extractStyleBlocks(footerRaw);
  const chromeCss = dedupeCss([...header.cssBlocks, ...footer.cssBlocks]);
  return {
    ...chrome,
    headerHtml: header.html,
    footerHtml: footer.html,
    chromeCss: chromeCss || undefined,
  };
}

export function decodeHtmlEntities(value: string): string {
  if (!value || !/[&]/.test(value)) return value;
  return value
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#038;|&amp;/g, "&")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

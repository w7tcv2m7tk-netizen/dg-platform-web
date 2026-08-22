/**
 * Public HTML islands (WP/Oxygen imports) can include leftover document
 * chrome. A <title> in the island overrides Next metadata in the browser.
 */
export function stripImportedDocumentChrome(html: string): string {
  if (!html) return html;
  return html
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, "");
}

/** Strip document chrome + non-executing scripts from header/footer HTML islands. */
export function stripChromeDocumentShell(html: string): string {
  if (!html) return html;
  return stripImportedDocumentChrome(html).replace(/<script\b[\s\S]*?<\/script>/gi, "");
}

const CHROME_ROOT_STYLE = `
.wb-chrome-root img{max-width:none;height:auto}
.wb-chrome-root .dg-full-logo,.wb-chrome-root img.dg-full-logo{height:28px!important;width:auto!important;max-width:11rem!important;object-fit:contain}
.wb-chrome-root .dg-gate-icon,.wb-chrome-root img.dg-gate-icon{width:32px!important;height:32px!important;object-fit:contain}
.wb-chrome-root .dg-logo-fallback{display:none}
`.trim();

/** Hoist inline styles and wrap marketing chrome for Gen 2 Website Studio. */
export function prepareMarketingChromeHtml(
  html: string,
  options?: { iconUrl?: string; logoUrl?: string },
): string {
  const iconUrl = options?.iconUrl ?? "https://app.digitalgate.com.au/brand/icon-light.png";
  const logoUrl = options?.logoUrl ?? "https://app.digitalgate.com.au/brand/logo-on-dark.png";

  let out = stripChromeDocumentShell(html);
  out = out
    .replace(
      /https?:\/\/digitalgate\.com\.au\/wp-content\/uploads\/[^"'>\s]*Gate-Icon[^"'>\s]*/gi,
      iconUrl,
    )
    .replace(
      /https?:\/\/digitalgate\.com\.au\/wp-content\/uploads\/[^"'>\s]*DigitalGate-Banner[^"'>\s]*/gi,
      logoUrl,
    )
    .replace(
      /https?:\/\/digitalgate\.com\.au\/wp-content\/uploads\/[^"'>\s]*Banner-Light[^"'>\s]*/gi,
      logoUrl,
    );

  const styles: string[] = [];
  out = out.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css: string) => {
    const scoped = String(css)
      .replace(
        /(^|[,}])\s*body(?!\.(?:menu-open|dg-has-fixed-header))\s*(?=[\s,{])/gi,
        "$1 .wb-chrome-root ",
      )
      .replace(/(^|[,}])\s*html\s*(?=[\s,{])/gi, "$1 .wb-chrome-root ");
    if (scoped.trim()) styles.push(scoped);
    return "";
  });

  const styleTag = styles.length
    ? `<style>\n${styles.join("\n")}\n${CHROME_ROOT_STYLE}\n</style>`
    : `<style>\n${CHROME_ROOT_STYLE}\n</style>`;

  return `${styleTag}\n<div class="wb-chrome-root">\n${out.trim()}\n</div>`.trim();
}

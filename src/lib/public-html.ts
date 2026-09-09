/**
 * Public HTML islands are operator-authored/imported content rendered inside a
 * DigitalGate public site. Treat the stored markup as untrusted at render time:
 * Studio permission is not a substitute for browser XSS protection.
 */

const BLOCKED_ELEMENT_RE =
  /<(script|iframe|object|embed|base|meta|link)\b[^>]*>[\s\S]*?<\/\1\s*>|<(script|iframe|object|embed|base|meta|link)\b[^>]*\/?>/gi;

const EVENT_ATTRIBUTE_RE =
  /\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const SRCDOC_ATTRIBUTE_RE =
  /\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const FORM_ACTION_ATTRIBUTE_RE =
  /\s+(?:action|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const URL_ATTRIBUTE_RE =
  /\s+(href|src|xlink:href|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const STYLE_ATTRIBUTE_RE =
  /\s+style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

function decodeUrlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);?/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&colon;/gi, ":")
    .replace(/&tab;/gi, "\t")
    .replace(/&newline;/gi, "\n")
    .replace(/&amp;/gi, "&");
}

function normaliseUrlForPolicy(value: string): string {
  return decodeUrlEntities(value)
    .replace(/[\u0000-\u0020\u007f-\u009f]+/g, "")
    .trim()
    .toLowerCase();
}

function isSafePublicUrl(attribute: string, value: string): boolean {
  const normalised = normaliseUrlForPolicy(value);
  if (!normalised) return true;
  if (
    normalised.startsWith("javascript:") ||
    normalised.startsWith("vbscript:") ||
    normalised.startsWith("data:text/") ||
    normalised.startsWith("data:application/")
  ) {
    return false;
  }
  if (normalised.startsWith("data:")) {
    return (
      attribute === "src" &&
      /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i.test(normalised)
    );
  }
  return true;
}

function quoteAttribute(value: string): string {
  return `"${value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`;
}

/**
 * Remove script-capable CSS primitives while preserving normal Studio design
 * CSS. Modern browsers do not execute arbitrary CSS as JS, but imported legacy
 * CSS can still contain historic executable constructs.
 */
export function sanitisePublicCss(css: string): string {
  if (!css) return css;
  return css
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/(?:behavior|-moz-binding)\s*:\s*[^;}]+[;}]/gi, "")
    .replace(/url\s*\(\s*(['"]?)\s*(?:javascript|vbscript)\s*:[\s\S]*?\1\s*\)/gi, "url()")
    .replace(/url\s*\(\s*(['"]?)\s*data\s*:\s*(?:text|application)\/[\s\S]*?\1\s*\)/gi, "url()");
}

/**
 * Conservative render-time sanitizer for Website Studio HTML islands.
 *
 * It deliberately preserves layout/content tags, classes, data-* attributes,
 * inline styles and safe URLs because imported sites depend on them, while
 * removing browser-executable elements/attributes and dangerous URL schemes.
 * This is defence in depth at the public rendering boundary; stored source is
 * left untouched so Studio remains the content authority.
 */
export function sanitisePublicHtml(html: string): string {
  if (!html) return html;
  let out = html
    .replace(BLOCKED_ELEMENT_RE, "")
    .replace(EVENT_ATTRIBUTE_RE, "")
    .replace(SRCDOC_ATTRIBUTE_RE, "")
    // Public forms are hydrated into explicit Gen 2 handlers. Never preserve an
    // imported browser-submit endpoint or per-button override.
    .replace(FORM_ACTION_ATTRIBUTE_RE, "");

  out = out.replace(
    URL_ATTRIBUTE_RE,
    (full, attribute: string, doubleQuoted?: string, singleQuoted?: string, bare?: string) => {
      const value = doubleQuoted ?? singleQuoted ?? bare ?? "";
      if (!isSafePublicUrl(attribute.toLowerCase(), value)) return "";
      return ` ${attribute}=${quoteAttribute(value)}`;
    },
  );

  out = out.replace(
    STYLE_ATTRIBUTE_RE,
    (_full, doubleQuoted?: string, singleQuoted?: string, bare?: string) => {
      const value = doubleQuoted ?? singleQuoted ?? bare ?? "";
      const safe = sanitisePublicCss(value);
      return safe.trim() ? ` style=${quoteAttribute(safe)}` : "";
    },
  );

  return out;
}

/**
 * Public HTML islands (WP/Oxygen imports) can include leftover document
 * chrome. A <title> in the island overrides Next metadata in the browser.
 */
export function stripImportedDocumentChrome(html: string): string {
  if (!html) return html;
  const stripped = html
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, "");
  return sanitisePublicHtml(stripped);
}

/** Strip document chrome + executable markup from header/footer HTML islands. */
export function stripChromeDocumentShell(html: string): string {
  if (!html) return html;
  return stripImportedDocumentChrome(html);
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
    const scoped = sanitisePublicCss(String(css))
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

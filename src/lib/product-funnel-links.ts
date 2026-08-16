/**
 * Canonical product-funnel URLs + rewrite helpers so brand-site CTAs
 * always hit the dedicated subdomain apps (not in-site pages).
 */

export const PRODUCT_FUNNEL_URLS = {
  businessAudit: "https://audit.digitalgate.com.au",
  propertyReport: "https://report.roerealty.com.au",
} as const;

const PATH_MAP: Array<{ re: RegExp; url: string }> = [
  {
    re: /^(?:https?:\/\/(?:www\.)?digitalgate\.com\.au)?\/?(?:business-audit|free-agency-audit)\/?(?:[?#].*)?$/i,
    url: PRODUCT_FUNNEL_URLS.businessAudit,
  },
  {
    re: /^(?:https?:\/\/(?:www\.)?roerealty\.com\.au)?\/?property-report\/?(?:[?#].*)?$/i,
    url: PRODUCT_FUNNEL_URLS.propertyReport,
  },
];

/** Map a single href (absolute or site-relative) onto a product funnel when applicable. */
export function rewriteProductFunnelHref(href: string | null | undefined): string {
  const raw = (href || "").trim();
  if (!raw) return raw;
  for (const { re, url } of PATH_MAP) {
    if (re.test(raw)) return url;
  }
  // Paths that include basePath prefix from Studio previews: /sites/digitalgate/business-audit
  if (/\/business-audit\/?$/i.test(raw) || /\/free-agency-audit\/?$/i.test(raw)) {
    return PRODUCT_FUNNEL_URLS.businessAudit;
  }
  if (/\/property-report\/?$/i.test(raw)) {
    return PRODUCT_FUNNEL_URLS.propertyReport;
  }
  return raw;
}

/** Rewrite href attributes inside HTML blobs (page components / chrome). */
export function rewriteProductFunnelHtml(html: string): string {
  if (!html || !/business-audit|free-agency-audit|property-report/i.test(html)) {
    return html;
  }
  return html.replace(
    /\bhref=(["'])([^"']+)\1/gi,
    (_full, quote: string, href: string) => {
      const next = rewriteProductFunnelHref(href);
      return `href=${quote}${next}${quote}`;
    },
  );
}

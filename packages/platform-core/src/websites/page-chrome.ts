import type { WebsiteSeo } from "./types";

/**
 * Pages that are usually self-contained (no site nav / footer).
 * Studio can override per page via seo.showHeader / seo.showFooter.
 */
const CHROMELESS_SLUG_RE =
  /^(card|onboarding|booking-confirmed|booking-application|book-application|application|privacy|privacy-policy|terms|terms-conditions|terms-of-service|legal|legal-notice|agent-disclaimer|artist-disclaimer|copyright-notice|cookie|cookies|disclaimer|founding-customer-terms)(-|$)/i;

/** CVH / stay bookable unit pages — chromeless by default (booking app surface). */
const STAY_UNIT_LEAF_SLUGS = new Set(["private-studio", "tiny-home"]);

export type PageChromeVisibility = {
  showHeader: boolean;
  showFooter: boolean;
};

export function isDefaultChromelessPage(slug: string | null | undefined): boolean {
  const cleaned = (slug || "").toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!cleaned) return false;
  // RR property detail pages (not the /properties hub)
  if (cleaned.startsWith("property/")) return true;
  const leaf = cleaned.split("/").filter(Boolean).pop() ?? cleaned;
  if (STAY_UNIT_LEAF_SLUGS.has(leaf)) return true;
  return CHROMELESS_SLUG_RE.test(cleaned);
}

/** Auto defaults when Studio has not set an explicit override. */
export function defaultPageChromeVisibility(
  slug: string | null | undefined,
): PageChromeVisibility {
  const hide = isDefaultChromelessPage(slug);
  return { showHeader: !hide, showFooter: !hide };
}

/**
 * Resolve effective header/footer visibility.
 * Explicit `seo.showHeader` / `seo.showFooter` win; otherwise slug defaults apply.
 */
export function resolvePageChromeVisibility(
  slug: string | null | undefined,
  seo?: WebsiteSeo | null,
): PageChromeVisibility {
  const defaults = defaultPageChromeVisibility(slug);
  return {
    showHeader:
      typeof seo?.showHeader === "boolean" ? seo.showHeader : defaults.showHeader,
    showFooter:
      typeof seo?.showFooter === "boolean" ? seo.showFooter : defaults.showFooter,
  };
}

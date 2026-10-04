/** DigitalGate public Strategy Session booking — native Gen 2 page contract. */

export const DG_STRATEGY_SESSION_SLUG = "strategy-session";

export const DG_STRATEGY_SESSION_HERO =
  "https://dhcfjdm3qhtlfaul.public.blob.vercel-storage.com/org-assets/cmsfkd6n50000ju046to0po60/studio-images/b45b217e1549b4d6-IuDAUYKoNfD9YYGeXNlLBLBSTq7Iya.jpg";

export const DG_STRATEGY_SESSION_TITLE = "Book a DigitalGate Strategy Session";

export const DG_STRATEGY_SESSION_DESCRIPTION =
  "A 30–45 minute conversation to understand your business, identify opportunities across CRM, websites, marketing, automation, AI and operations, and decide whether DigitalGate is a good fit.";

export const DG_STRATEGY_SESSION_SEO_TITLE =
  "Book a DigitalGate Strategy Session | DigitalGate";

export function isDgStrategySessionPage(
  siteSlug: string | null | undefined,
  pageSlug: string | null | undefined,
): boolean {
  return (
    (siteSlug || "").toLowerCase() === "digitalgate" &&
    (pageSlug || "").toLowerCase().replace(/^\/+|\/+$/g, "") ===
      DG_STRATEGY_SESSION_SLUG
  );
}

type HtmlComponentLike = {
  type?: string;
  props?: Record<string, unknown> | null;
};

/** Joined Studio HTML for the Strategy Session page. Empty string when none. */
export function strategySessionStudioHtml(
  components: HtmlComponentLike[] | null | undefined,
): string {
  return (components ?? [])
    .filter((component) => component.type === "html")
    .map((component) =>
      typeof component.props?.html === "string" ? component.props.html : "",
    )
    .join("\n")
    .trim();
}

/** Live booking form already present in Studio HTML — do not replace it. */
export function strategySessionStudioHtmlHasBookingForm(html: string): boolean {
  const markup = html.trim();
  if (!markup) return false;
  return /id\s*=\s*["']dgBookingForm["']/i.test(markup) || /<form[\s>]/i.test(markup);
}

/**
 * Use the native React capture only when Studio has no page HTML, or the
 * saved HTML has no form to hydrate.
 */
export function shouldRenderNativeStrategySessionCapture(
  components: HtmlComponentLike[] | null | undefined,
): boolean {
  const html = strategySessionStudioHtml(components);
  return !strategySessionStudioHtmlHasBookingForm(html);
}

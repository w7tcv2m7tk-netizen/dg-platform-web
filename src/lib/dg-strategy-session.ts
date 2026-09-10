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

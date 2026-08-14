import { findDomainByHostname, getWebsiteBySlug } from "@dg/platform-core";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { WebsitePageRenderer } from "@/components/websites/WebsiteRenderer";
import { websiteRendererCss } from "@/components/websites/website-renderer-css";

type SiteChrome = {
  headerHtml?: string;
  footerHtml?: string;
  stylesheets?: string[];
  navLinks?: Array<{ label: string; href: string }>;
  businessName?: string;
  overlayHeader?: boolean;
};

function chromeFromSite(
  metadata: Record<string, unknown> | null | undefined,
): SiteChrome | null {
  if (!metadata || typeof metadata !== "object") return null;
  const chrome = metadata.chrome;
  if (!chrome || typeof chrome !== "object") return null;
  return chrome as SiteChrome;
}

/**
 * Custom-hostname entry — middleware rewrites unknown hosts here.
 * Resolves InfrastructureDomain → Website and renders the public site at `/`.
 */
export default async function ByHostSitePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; page?: string }>;
}) {
  const hdrs = await headers();
  const host = (
    hdrs.get("x-dg-custom-host") ||
    hdrs.get("x-forwarded-host") ||
    hdrs.get("host") ||
    ""
  )
    .split(":")[0]
    .toLowerCase();

  if (!host) notFound();

  const match = await findDomainByHostname(host);
  if (!match?.website?.slug) {
    // Try www-stripped / apex variant
    const alt = host.startsWith("www.")
      ? host.slice(4)
      : `www.${host}`;
    const match2 = await findDomainByHostname(alt);
    if (!match2?.website?.slug) notFound();
    return renderSite(match2.website.slug, await searchParams);
  }

  return renderSite(match.website.slug, await searchParams);
}

async function renderSite(
  slug: string,
  search: { preview?: string; page?: string },
) {
  const allowDraft = search.preview === "1";
  const site = await getWebsiteBySlug(slug);
  if (!site) notFound();
  if (!allowDraft && site.status !== "published") notFound();

  const pages = site.pages ?? [];
  const pageSlug = search.page;
  const page = pageSlug
    ? pages.find((p) => p.slug === pageSlug)
    : pages.find((p) => p.intent === "home" || p.slug === "home") || pages[0];
  if (!page) notFound();

  // Keep path-based URLs consistent when opened via custom host deep-links
  if (pageSlug && page.slug === "home") {
    redirect("/");
  }

  const theme = site.theme ?? {};
  const chrome = chromeFromSite(
    site.metadata as Record<string, unknown> | null | undefined,
  );
  const title = page.seo?.title || site.seo?.title || site.name;

  return (
    <>
      <title>{title}</title>
      <meta
        name="description"
        content={page.seo?.description || site.seo?.description || site.name}
      />
      {(chrome?.stylesheets ?? []).slice(0, 20).map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: websiteRendererCss }} />
      {allowDraft && site.status !== "published" ? (
        <div
          style={{
            background: "#92400e",
            color: "#fff",
            textAlign: "center",
            padding: "0.5rem",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.85rem",
          }}
        >
          Preview · draft — not published
        </div>
      ) : null}
      <WebsitePageRenderer
        components={page.components}
        theme={theme}
        basePath=""
        siteSlug={slug}
        pageSlug={page.slug}
        chrome={chrome}
      />
    </>
  );
}

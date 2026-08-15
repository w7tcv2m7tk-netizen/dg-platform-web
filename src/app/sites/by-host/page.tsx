import { findDomainByHostname, getWebsiteBySlug } from "@dg/platform-core";
import type { Metadata } from "next";
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
  lightSurface?: boolean;
  headerCta?: { label: string; href: string };
};

function chromeFromSite(
  metadata: Record<string, unknown> | null | undefined,
): SiteChrome | null {
  if (!metadata || typeof metadata !== "object") return null;
  const chrome = metadata.chrome;
  if (!chrome || typeof chrome !== "object") return null;
  return chrome as SiteChrome;
}

async function resolveHostSlug(): Promise<string | null> {
  const hdrs = await headers();
  const host = (
    hdrs.get("x-dg-custom-host") ||
    hdrs.get("x-forwarded-host") ||
    hdrs.get("host") ||
    ""
  )
    .split(":")[0]
    .toLowerCase();
  if (!host) return null;

  const match = await findDomainByHostname(host);
  if (match?.website?.slug) return match.website.slug;

  const alt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  const match2 = await findDomainByHostname(alt);
  return match2?.website?.slug ?? null;
}

function resolvePage(
  site: NonNullable<Awaited<ReturnType<typeof getWebsiteBySlug>>>,
  pageSlug: string | undefined,
) {
  const pages = site.pages ?? [];
  if (!pageSlug) {
    return pages.find((p) => p.intent === "home" || p.slug === "home") || pages[0];
  }
  return (
    pages.find((p) => p.slug === pageSlug) ||
    pages.find((p) => p.slug === pageSlug.replace(/^accommodation\//, "")) ||
    pages.find((p) => {
      const leaf = pageSlug.split("/").filter(Boolean).pop();
      return Boolean(leaf && p.slug === leaf);
    }) ||
    null
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; page?: string }>;
}): Promise<Metadata> {
  const slug = await resolveHostSlug();
  if (!slug) return { title: "Site" };
  const search = await searchParams;
  const site = await getWebsiteBySlug(slug);
  if (!site) return { title: "Site" };
  const pageSlug = search.page ? decodeURIComponent(search.page) : undefined;
  const page = resolvePage(site, pageSlug);
  const title = page?.seo?.title || site.seo?.title || site.name;
  const description =
    page?.seo?.description || site.seo?.description || site.name;
  return {
    title,
    description,
    applicationName: site.name,
  };
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
  const slug = await resolveHostSlug();
  if (!slug) notFound();
  return renderSite(slug, await searchParams);
}

async function renderSite(
  slug: string,
  search: { preview?: string; page?: string },
) {
  const allowDraft = search.preview === "1";
  const site = await getWebsiteBySlug(slug);
  if (!site) notFound();
  if (!allowDraft && site.status !== "published") notFound();

  const pageSlug = search.page ? decodeURIComponent(search.page) : undefined;
  const page = resolvePage(site, pageSlug);
  if (!page) notFound();

  if (pageSlug && page.slug === "home") {
    redirect("/");
  }

  const theme = site.theme ?? {};
  const chrome = chromeFromSite(
    site.metadata as Record<string, unknown> | null | undefined,
  );

  return (
    <>
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

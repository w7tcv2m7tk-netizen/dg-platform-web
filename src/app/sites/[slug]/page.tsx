import { getWebsiteBySlug } from "@dg/platform-core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WebsitePageRenderer } from "@/components/websites/WebsiteRenderer";
import { websiteRendererCss } from "@/components/websites/website-renderer-css";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

function resolveHome(site: NonNullable<Awaited<ReturnType<typeof getWebsiteBySlug>>>) {
  const pages = site.pages ?? [];
  return pages.find((p) => p.intent === "home" || p.slug === "home") || pages[0];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await getWebsiteBySlug(slug);
  if (!site) return { title: "Site" };
  const home = resolveHome(site);
  const title = home?.seo?.title || site.seo?.title || site.name;
  const description =
    home?.seo?.description || site.seo?.description || site.name;
  const ogTitle = home?.seo?.ogTitle || site.seo?.ogTitle || title;
  const ogDescription =
    home?.seo?.ogDescription || site.seo?.ogDescription || description;
  const ogImage = home?.seo?.ogImage || site.seo?.ogImage;

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default async function PublicSiteHomePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const allowDraft = preview === "1";

  const site = await getWebsiteBySlug(slug);
  if (!site) notFound();
  if (!allowDraft && site.status !== "published") notFound();

  const home = resolveHome(site);
  if (!home) notFound();

  const theme = site.theme ?? {};
  const title = home.seo?.title || site.seo?.title || site.name;
  const description =
    home.seo?.description || site.seo?.description || site.name;
  const ogTitle = home.seo?.ogTitle || site.seo?.ogTitle || title;
  const ogDescription =
    home.seo?.ogDescription || site.seo?.ogDescription || description;
  const ogImage = home.seo?.ogImage || site.seo?.ogImage;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
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
        components={home.components}
        theme={theme}
        basePath={`/sites/${slug}`}
        siteSlug={slug}
        pageSlug={home.slug}
        chrome={
          site.metadata && typeof site.metadata === "object"
            ? ((site.metadata as { chrome?: { headerHtml?: string; footerHtml?: string } })
                .chrome ?? null)
            : null
        }
      />
    </>
  );
}

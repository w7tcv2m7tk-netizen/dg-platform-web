import { getWebsiteBySlug } from "@dg/platform-core";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { WebsitePageRenderer } from "@/components/websites/WebsiteRenderer";
import { websiteRendererCss } from "@/components/websites/website-renderer-css";

type Props = {
  params: Promise<{ slug: string; pageSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const site = await getWebsiteBySlug(slug);
  if (!site) return { title: "Site" };
  const page = (site.pages ?? []).find((p) => p.slug === pageSlug);
  if (!page) return { title: site.name };
  const title = page.seo?.title || `${page.title} | ${site.name}`;
  const description =
    page.seo?.description || site.seo?.description || site.name;
  const ogTitle = page.seo?.ogTitle || site.seo?.ogTitle || title;
  const ogDescription =
    page.seo?.ogDescription || site.seo?.ogDescription || description;
  const ogImage = page.seo?.ogImage || site.seo?.ogImage;
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

export default async function PublicSitePage({ params, searchParams }: Props) {
  const { slug, pageSlug } = await params;
  const { preview } = await searchParams;
  const allowDraft = preview === "1";

  if (pageSlug === "home") {
    redirect(allowDraft ? `/sites/${slug}?preview=1` : `/sites/${slug}`);
  }

  const site = await getWebsiteBySlug(slug);
  if (!site) notFound();
  if (!allowDraft && site.status !== "published") notFound();

  const page = (site.pages ?? []).find((p) => p.slug === pageSlug);
  if (!page) notFound();

  const theme = site.theme ?? {};
  const title = page.seo?.title || `${page.title} | ${site.name}`;
  const description =
    page.seo?.description || site.seo?.description || site.name;
  const ogTitle = page.seo?.ogTitle || site.seo?.ogTitle || title;
  const ogDescription =
    page.seo?.ogDescription || site.seo?.ogDescription || description;
  const ogImage = page.seo?.ogImage || site.seo?.ogImage;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      <style dangerouslySetInnerHTML={{ __html: websiteRendererCss }} />
      <WebsitePageRenderer
        components={page.components}
        theme={theme}
        basePath={`/sites/${slug}`}
        siteSlug={slug}
        pageSlug={page.slug}
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

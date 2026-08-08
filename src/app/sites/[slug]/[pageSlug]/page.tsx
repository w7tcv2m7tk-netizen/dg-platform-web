import { getWebsiteBySlug } from "@dg/platform-core";
import { notFound, redirect } from "next/navigation";

import { WebsitePageRenderer } from "@/components/websites/WebsiteRenderer";
import { websiteRendererCss } from "@/components/websites/website-renderer-css";

type Props = {
  params: Promise<{ slug: string; pageSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

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

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={page.seo?.description || site.name} />
      <style dangerouslySetInnerHTML={{ __html: websiteRendererCss }} />
      <WebsitePageRenderer
        components={page.components}
        theme={theme}
        basePath={`/sites/${slug}`}
        siteSlug={slug}
        pageSlug={page.slug}
      />
    </>
  );
}

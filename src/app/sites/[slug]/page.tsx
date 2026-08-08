import { getWebsiteBySlug } from "@dg/platform-core";
import { notFound } from "next/navigation";

import { WebsitePageRenderer } from "@/components/websites/WebsiteRenderer";
import { websiteRendererCss } from "@/components/websites/website-renderer-css";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export default async function PublicSiteHomePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const allowDraft = preview === "1";

  const site = await getWebsiteBySlug(slug);
  if (!site) notFound();
  if (!allowDraft && site.status !== "published") notFound();

  const pages = site.pages ?? [];
  const home =
    pages.find((p) => p.intent === "home" || p.slug === "home") || pages[0];
  if (!home) notFound();

  const theme = site.theme ?? {};
  const title = home.seo?.title || site.seo?.title || site.name;

  return (
    <>
      <title>{title}</title>
      <meta
        name="description"
        content={home.seo?.description || site.seo?.description || site.name}
      />
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
      />
    </>
  );
}

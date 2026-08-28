import { getPublicStayUnit, getWebsiteForPublicRender, resolveFunnelTemplate, resolvePageChromeVisibility, resolveStayUnitSlug, ensureHideawayCircleWebsitePage } from "@dg/platform-core";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect, unstable_rethrow } from "next/navigation";

import { isAetherraPublicHost } from "@/lib/aetherra-legacy-urls";
import { CVH_PAGE_ALIASES } from "@/lib/cvh-legacy-urls";
import { DG_PAGE_ALIASES, isDgPublicHost } from "@/lib/dg-legacy-urls";
import { resolvePublicHostSlug } from "@/lib/resolve-public-host-slug";
import { ROE_PAGE_ALIASES, isRoePublicHost } from "@/lib/roe-legacy-urls";

import { BusinessAuditCapture } from "@/components/websites/BusinessAuditCapture";
import { HideawayCircleCapture } from "@/components/websites/HideawayCircleCapture";
import { PropertyReportCapture } from "@/components/websites/PropertyReportCapture";
import { WebsitePageRenderer } from "@/components/websites/WebsiteRenderer";
import { FoundingResellerPublicCopy } from "@/components/founding/FoundingResellerPublicCopy";
import { websiteRendererCss } from "@/components/websites/website-renderer-css";
import {
  isRetiredPublicOnboarding,
  PublicOnboardingRetired,
} from "@/components/founding/PublicOnboardingRetired";
import { PublicFoundingInviteAccept } from "@/components/founding/PublicFoundingInviteAccept";
import { PublicFoundingResellerInviteAccept } from "@/components/founding/PublicFoundingResellerInviteAccept";
import { PublicDeliveryPartnerInviteAccept } from "@/components/delivery/PublicDeliveryPartnerInviteAccept";
import {
  parseDeliveryPartnerInvitePageSlug,
  parseFoundingInvitePageSlug,
  parseFoundingResellerInvitePageSlug,
} from "@/lib/founding-invite-page-slug";
import {
  getPublicDeliveryPartnerInvitation,
  getPublicFoundingInvitation,
  getPublicFoundingResellerInvitation,
} from "@dg/platform-core";
import { publicOgImageForSlug } from "@/lib/brand";
import {
  jsonLdScriptHtml,
  publicPageJsonLdGraph,
  publicPageMetadata,
} from "@/lib/public-website-seo";
import {
  chromeFromSiteMetadata,
  decodeHtmlEntities,
  preparePublicChrome,
} from "@/lib/public-chrome";

async function resolveRequestHost(): Promise<string> {
  const hdrs = await headers();
  return (
    hdrs.get("x-dg-custom-host") ||
    hdrs.get("x-forwarded-host") ||
    hdrs.get("host") ||
    ""
  )
    .split(":")[0]
    .toLowerCase();
}

async function resolveHostSlug(): Promise<string | null> {
  return resolvePublicHostSlug(await resolveRequestHost());
}

const PAGE_SLUG_ALIASES: Record<string, string> = {
  property: "properties",
  "free-property-appraisal": "property-appraisal",
  "property-appraisal-gold-coast": "property-appraisal",
  "free-buyer-consultation": "buyer-consultation",
  "private-studio": "garden-studio",
  "accommodation/private-studio": "garden-studio",
};

function isCvhSiteSlug(slug: string): boolean {
  return /currumbin|hideaway/i.test(slug);
}

function isDgSiteSlug(slug: string): boolean {
  return slug === "digitalgate";
}

function isRoeSiteSlug(slug: string): boolean {
  return slug === "roe-realty";
}

function isAetherraSiteSlug(slug: string): boolean {
  return slug === "aetheriel-com-au" || /aetherra/i.test(slug);
}

function decodePageSlug(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function pageAliasMap(siteSlug: string): Record<string, string> {
  if (isCvhSiteSlug(siteSlug)) return { ...PAGE_SLUG_ALIASES, ...CVH_PAGE_ALIASES };
  if (isDgSiteSlug(siteSlug)) return { ...PAGE_SLUG_ALIASES, ...DG_PAGE_ALIASES };
  if (isRoeSiteSlug(siteSlug)) return { ...PAGE_SLUG_ALIASES, ...ROE_PAGE_ALIASES };
  if (isAetherraSiteSlug(siteSlug)) return {};
  return PAGE_SLUG_ALIASES;
}

function queryPageSlug(siteSlug: string, pageSlug?: string): string | undefined {
  if (!pageSlug) return undefined;
  const dateLeaf =
    isDgSiteSlug(siteSlug) || isAetherraSiteSlug(siteSlug)
      ? undefined
      : pageSlug.match(/^\d{4}\/\d{2}\/\d{2}\/([^/]+)$/)?.[1];
  return pageAliasMap(siteSlug)[pageSlug] || dateLeaf || pageSlug;
}

function resolvePage(
  site: NonNullable<Awaited<ReturnType<typeof getWebsiteForPublicRender>>>,
  pageSlug: string | undefined,
) {
  const pages = site.pages ?? [];
  if (!pageSlug) {
    return pages.find((p) => p.intent === "home" || p.slug === "home") || pages[0];
  }
  const aliased = queryPageSlug(site.slug, pageSlug) || pageSlug;
  const exact =
    pages.find((p) => p.slug === aliased) ||
    pages.find((p) => p.slug === pageSlug) ||
    null;
  if (exact) return exact;
  return (
    pages.find((p) => p.slug === pageSlug.replace(/^accommodation\//, "")) ||
    pages.find((p) => {
      const leaf = pageSlug.split("/").filter(Boolean).pop();
      return Boolean(leaf && p.slug === leaf);
    }) ||
    null
  );
}

function publicPagePath(page: { slug: string; intent?: string | null }): string {
  if (!page.slug || page.slug === "home" || page.intent === "home") return "/";
  return `/${page.slug.replace(/^\/+/, "")}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; page?: string }>;
}): Promise<Metadata> {
  try {
    const slug = await resolveHostSlug();
    if (!slug) return { title: "Site" };
    const search = await searchParams;
    const pageSlug = decodePageSlug(search.page);
    const site = await getWebsiteForPublicRender(slug, queryPageSlug(slug, pageSlug));
    if (!site) return { title: "Site" };
    const inviteToken = isDgSiteSlug(slug) ? parseFoundingInvitePageSlug(pageSlug) : null;
    if (inviteToken) {
      return {
        title: "Founding 10 invitation | DigitalGate",
        description:
          "You've been personally invited to join DigitalGate's Founding 10.",
        robots: { index: false, follow: false },
      };
    }
    const resellerInviteToken = isDgSiteSlug(slug)
      ? parseFoundingResellerInvitePageSlug(pageSlug)
      : null;
    if (resellerInviteToken) {
      return {
        title: "Founding Acquisition Partner invitation | DigitalGate",
        description:
          "You've been personally invited to join DigitalGate's Founding Acquisition Partner Programme.",
        robots: { index: false, follow: false },
      };
    }
    const page = resolvePage(site, pageSlug);
    const host = await resolveRequestHost();
    const canonicalHost =
      isDgPublicHost(host) || isRoePublicHost(host) || isAetherraPublicHost(host)
        ? host.replace(/^www\./, "")
        : host;
    const theme = site.theme as { iconUrl?: string } | null | undefined;
    const seo = page?.seo ?? {};
    return publicPageMetadata({
      siteSlug: site.slug,
      siteName: site.slug === "wantd" ? "Wantd" : site.name,
      pageSlug: page?.slug || "home",
      pageTitle: page?.title,
      title: decodeHtmlEntities(seo.title || site.seo?.title || site.name),
      description: seo.description || site.seo?.description || site.name,
      ogTitle: seo.ogTitle,
      ogDescription: seo.ogDescription,
      keywords: seo.keywords?.length ? seo.keywords : site.seo?.keywords,
      canonicalHost,
      iconUrl: theme?.iconUrl,
      publishedAt: seo.publishedAt,
      modifiedAt: seo.modifiedAt,
      schemaType: seo.schemaType,
      authorName: seo.authorName,
      noindex: seo.noindex,
      ogImage: seo.ogImage || site.seo?.ogImage,
    });
  } catch (err) {
    unstable_rethrow(err);
    return { title: "Site temporarily unavailable" };
  }
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
  try {
    const slug = await resolveHostSlug();
    if (!slug) notFound();
    return await renderSite(slug, await searchParams);
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : "";
    if (message === "SITE_DATABASE_UNAVAILABLE" || /Can't reach database|P1001|P1017/i.test(message)) {
      return (
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "#0b1220",
            color: "#e2e8f0",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
              Site temporarily unavailable
            </h1>
            <p style={{ color: "#94a3b8", maxWidth: "28rem", margin: "0 auto" }}>
              We couldn&apos;t reach the website database. Please try again in a minute.
            </p>
          </div>
        </main>
      );
    }
    console.error("[by-host] unexpected render error", err);
    notFound();
  }
}

async function renderSite(
  slug: string,
  search: { preview?: string; page?: string },
) {
  const allowDraft = search.preview === "1";
  const pageSlug = decodePageSlug(search.page);
  let site: Awaited<ReturnType<typeof getWebsiteForPublicRender>>;
  try {
    site = await getWebsiteForPublicRender(slug, queryPageSlug(slug, pageSlug));
  } catch (err) {
    unstable_rethrow(err);
    console.error("[by-host] getWebsiteForPublicRender failed", err);
    throw new Error("SITE_DATABASE_UNAVAILABLE");
  }
  if (!site) notFound();
  if (!allowDraft && site.status !== "published") notFound();

  const inviteToken = isDgSiteSlug(slug) ? parseFoundingInvitePageSlug(pageSlug) : null;
  if (inviteToken) {
    const invitation = await getPublicFoundingInvitation(inviteToken);
    return (
      <div
        className="wb-root wb-html-page"
        style={{ minHeight: "100dvh", background: "#0A0E17" }}
      >
        {invitation ? (
          <PublicFoundingInviteAccept
            token={inviteToken}
            firstName={invitation.firstName}
            businessName={invitation.businessName}
            invitedByName={invitation.invitedByName}
            withdrawn={invitation.withdrawn}
            alreadyAccepted={invitation.status === "accepted"}
            alreadyInProgramme={invitation.alreadyInProgramme}
          />
        ) : (
          <div className="mx-auto max-w-2xl px-6 py-16 text-slate-200">
            <h1 className="text-3xl font-bold text-white">Invitation not found</h1>
            <p className="mt-4 text-slate-300">
              This Founding 10 invitation link is invalid or has expired. If you
              were expecting an invitation, contact Ben Roe at hello@digitalgate.com.au.
            </p>
          </div>
        )}
      </div>
    );
  }

  const resellerInviteToken = isDgSiteSlug(slug)
    ? parseFoundingResellerInvitePageSlug(pageSlug)
    : null;
  if (resellerInviteToken) {
    const invitation = await getPublicFoundingResellerInvitation(resellerInviteToken);
    return (
      <div
        className="wb-root wb-html-page"
        style={{ minHeight: "100dvh", background: "#0A0E17" }}
      >
        {invitation ? (
          <PublicFoundingResellerInviteAccept
            token={resellerInviteToken}
            firstName={invitation.firstName}
            businessName={invitation.businessName}
            invitedByName={invitation.invitedByName}
            withdrawn={invitation.withdrawn}
            alreadyAccepted={invitation.alreadyAccepted}
          />
        ) : (
          <div className="mx-auto max-w-2xl px-6 py-16 text-slate-200">
            <h1 className="text-3xl font-bold text-white">Invitation not found</h1>
            <p className="mt-4 text-slate-300">
              This Founding Acquisition Partner invitation link is invalid or has expired. If you
              were expecting an invitation, contact Ben Roe at hello@digitalgate.com.au.
            </p>
          </div>
        )}
      </div>
    );
  }

  const deliveryInviteToken = isDgSiteSlug(slug)
    ? parseDeliveryPartnerInvitePageSlug(pageSlug)
    : null;
  if (deliveryInviteToken) {
    const invitation = await getPublicDeliveryPartnerInvitation(deliveryInviteToken);
    return (
      <div
        className="wb-root wb-html-page"
        style={{ minHeight: "100dvh", background: "#0A0E17" }}
      >
        {invitation ? (
          <PublicDeliveryPartnerInviteAccept
            token={deliveryInviteToken}
            firstName={invitation.firstName}
            businessName={invitation.businessName}
            invitedByName={invitation.invitedByName}
            deliveryRole={invitation.deliveryRole}
            withdrawn={invitation.withdrawn}
            alreadyAccepted={invitation.alreadyAccepted}
          />
        ) : (
          <div className="mx-auto max-w-2xl px-6 py-16 text-slate-200">
            <h1 className="text-3xl font-bold text-white">Invitation not found</h1>
            <p className="mt-4 text-slate-300">
              This Delivery Partner invitation link is invalid or has expired. If you
              were expecting an invitation, contact Ben Roe at hello@digitalgate.com.au.
            </p>
          </div>
        )}
      </div>
    );
  }

  let page = resolvePage(site, pageSlug);
  if (
    !page &&
    pageSlug === "hideaway-circle" &&
    slug === "currumbin-valley-hideaway"
  ) {
    const ensured = await ensureHideawayCircleWebsitePage({ siteSlug: slug });
    if (ensured.ok) {
      site = (await getWebsiteForPublicRender(slug, pageSlug)) || site;
      page = site ? resolvePage(site, pageSlug) : null;
    }
  }
  if (
    !page &&
    slug === "wantd" &&
    (pageSlug === "for-agents" || pageSlug === "for-agent")
  ) {
    const home = resolvePage(site, undefined);
    if (home) {
      page = {
        ...home,
        slug: "for-agents",
        title: "For agents",
        intent: "custom",
        seo: {
          title: "For agents | Wantd",
          description:
            "Buyers tell Wantd what they want. If you have something that matches, say so.",
        },
        components: [
          {
            id: "wantd-agents-hero",
            type: "hero",
            props: {
              headline: "New Wantd",
              subheadline:
                "Buyers speak first. If you have something that matches, tell us.",
              ctaLabel: "I have something that matches",
              ctaHref: "/contact",
            },
          },
          {
            id: "wantd-agents-about",
            type: "about",
            props: {
              headline: "The reverse of advertising",
              body: "Instead of hoping the right buyer finds your listing, Wantd brings you people who already know what they want — suburb, budget, timing. Property is live now. You respond to demand.",
            },
          },
        ],
      };
    }
  }
  if (!page) notFound();

  if (pageSlug && page.slug !== pageSlug) {
    const dest = publicPagePath(page);
    redirect(allowDraft ? `${dest === "/" ? "/" : dest}?preview=1` : dest);
  }

  const theme = site.theme ?? {};
  const siteMeta = site.metadata as Record<string, unknown> | null | undefined;
  const preparedChrome = preparePublicChrome(chromeFromSiteMetadata(siteMeta));
  const chromeCss = preparedChrome?.chromeCss;
  const chrome = preparedChrome
    ? { ...preparedChrome, chromeCss: undefined }
    : null;
  const hostname = await resolveRequestHost();
  const canonicalHost =
    isDgPublicHost(hostname) ||
    isRoePublicHost(hostname) ||
    isAetherraPublicHost(hostname)
      ? hostname.replace(/^www\./, "")
      : hostname;
  const pageSeo = page.seo ?? {};
  const jsonLdGraph = publicPageJsonLdGraph({
    siteSlug: slug,
    pageSlug: page.slug,
    pageTitle: page.title || pageSeo.title || site.name,
    description: pageSeo.description || site.seo?.description || site.name,
    canonicalHost,
    publishedAt: pageSeo.publishedAt,
    modifiedAt: pageSeo.modifiedAt,
    authorName: pageSeo.authorName,
    schemaType: pageSeo.schemaType,
  });
  const jsonLdPayload = jsonLdScriptHtml(jsonLdGraph);
  const funnelTemplate =
    resolveFunnelTemplate({
      metadata: siteMeta,
      slug,
      hostname,
    }) ||
    (slug === "roe-realty-report" || page.slug === "property-report"
      ? "property_report"
      : slug === "digitalgate-audit" || page.slug === "business-audit"
        ? "business_audit"
        : slug === "currumbin-valley-hideaway-circle" ||
            page.slug === "hideaway-circle"
          ? "hideaway_circle"
          : null);
  const staySlug = resolveStayUnitSlug(page.slug);
  const stayUnit = staySlug
    ? await getPublicStayUnit(site.organisationId, staySlug)
    : null;
  const chromeDefaults = resolvePageChromeVisibility(page.slug, page.seo);
  const showHeader =
    funnelTemplate === "business_audit" ||
    funnelTemplate === "property_report" ||
    funnelTemplate === "hideaway_circle" ||
    page.slug === "hideaway-circle"
      ? false
      : chromeDefaults.showHeader;
  const showFooter =
    funnelTemplate === "business_audit" ||
    funnelTemplate === "property_report" ||
    funnelTemplate === "hideaway_circle" ||
    page.slug === "hideaway-circle"
      ? false
      : chromeDefaults.showFooter;

  return (
    <>
      {(funnelTemplate === "hideaway_circle"
        ? []
        : chrome?.stylesheets ?? []
      )
        .slice(0, 20)
        .map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      <style dangerouslySetInnerHTML={{ __html: websiteRendererCss }} />
      {chromeCss ? (
        <style id="wb-chrome-css" dangerouslySetInnerHTML={{ __html: chromeCss }} />
      ) : null}
      {jsonLdPayload ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdPayload }}
        />
      ) : null}
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
      {funnelTemplate === "property_report" ? (
        <div
          className="wb-root wb-html-page wb-full-bleed wb-product-funnel"
          style={
            {
              ["--wb-primary"]: theme.primaryColor || "#C9A46C",
              ["--wb-accent"]: theme.accentColor || "#1C2B2A",
              ["--wb-bg"]: theme.backgroundColor || "#1C2B2A",
              minHeight: "100dvh",
              width: "100%",
              margin: 0,
              padding: 0,
              background: "#1C2B2A",
            } as CSSProperties
          }
        >
          <PropertyReportCapture
            siteSlug={slug}
            basePath=""
            variant="funnel"
          />
        </div>
      ) : funnelTemplate === "business_audit" ? (
        <div
          className="wb-root wb-html-page wb-full-bleed wb-product-funnel"
          style={
            {
              ["--wb-primary"]: theme.primaryColor || "#3B82F6",
              ["--wb-accent"]: theme.accentColor || "#10B981",
              ["--wb-bg"]: theme.backgroundColor || "#0A0E17",
              minHeight: "100dvh",
              width: "100%",
              margin: 0,
              padding: 0,
              background: "#0A0E17",
            } as CSSProperties
          }
        >
          <BusinessAuditCapture
            siteSlug={slug}
            basePath=""
            variant="funnel"
          />
        </div>
      ) : funnelTemplate === "hideaway_circle" ? (
        <div
          className="wb-root wb-html-page wb-full-bleed wb-product-funnel"
          style={
            {
              ["--wb-primary"]: theme.primaryColor || "#B9A48A",
              ["--wb-accent"]: theme.accentColor || "#2C4137",
              ["--wb-bg"]: theme.backgroundColor || "#0c1612",
              minHeight: "100dvh",
              width: "100%",
              margin: 0,
              padding: 0,
              background: "#0c1612",
            } as CSSProperties
          }
        >
          <HideawayCircleCapture
            siteSlug={slug}
            basePath=""
            variant="funnel"
          />
        </div>
      ) : isRetiredPublicOnboarding(slug, page.slug) ? (
        <div
          className="wb-root wb-html-page"
          style={{ minHeight: "100dvh", background: "#0A0E17" }}
        >
          <PublicOnboardingRetired />
        </div>
      ) : (
        <>
          <WebsitePageRenderer
            components={page.components ?? []}
            theme={theme}
            basePath=""
            siteSlug={slug}
            pageSlug={page.slug}
            chrome={chrome}
            stayUnit={stayUnit}
            showHeader={showHeader}
            showFooter={showFooter}
            funnelTemplate={funnelTemplate}
          />
          {isDgSiteSlug(slug) && page.slug === "founding-customers" ? (
            <FoundingResellerPublicCopy />
          ) : null}
        </>
      )}
    </>
  );
}

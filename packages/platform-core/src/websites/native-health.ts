/**
 * Native Gen 2 website health — Website + InfrastructureDomain signals.
 */

import type {
  HealthCheck,
  SerializedWebsite,
  SiteHealthSnapshot,
  WebsiteComponent,
} from "./types";
import { pagespeedFromMetadata } from "./pagespeed";

export type NativeHealthDomain = {
  name: string;
  status?: string | null;
  dnsConfiguredAt?: string | Date | null;
  sslState?: string | null;
  /** Extra hostnames linked to the same website (aliases). */
  aliases?: string[];
} | null;

const HTML_FORM_MARKERS = [
  "<form",
  "dgcontactform",
  "dgfoundingform",
  "dgbookingform",
  "dgdiscoveryform",
  "/api/public/website-form",
  "/api/public/dg-enquiry",
];

function htmlHasPublicForm(html: unknown): boolean {
  if (typeof html !== "string" || !html) return false;
  const haystack = html.toLowerCase();
  return HTML_FORM_MARKERS.some((marker) => haystack.includes(marker));
}

function componentCapturesToCrm(component: WebsiteComponent): boolean {
  if (component.type === "contact_form") return true;
  if (component.type === "html") return htmlHasPublicForm(component.props.html);
  return false;
}

function funnelCapturesToCrm(site: SerializedWebsite): boolean {
  const meta = site.metadata;
  if (!meta || typeof meta !== "object") return false;
  if (meta.kind === "funnel") return true;
  if (typeof meta.capturePath === "string" && meta.capturePath.trim()) {
    return true;
  }
  if (typeof meta.funnelTemplate === "string" && meta.funnelTemplate.trim()) {
    return true;
  }
  return false;
}

function hasCrmCapture(site: SerializedWebsite): boolean {
  if (funnelCapturesToCrm(site)) return true;
  return (site.pages ?? []).some((p) =>
    p.components.some(componentCapturesToCrm),
  );
}

function crmCaptureDetail(site: SerializedWebsite, ok: boolean): string {
  if (!ok) {
    return "No CRM capture — add a contact form in Studio, or a public HTML / funnel form";
  }
  if (funnelCapturesToCrm(site)) {
    return "Product funnel capture posts to CRM";
  }
  const html = (site.pages ?? []).some((p) =>
    p.components.some(
      (c) => c.type === "html" && htmlHasPublicForm(c.props.html),
    ),
  );
  if (html) return "Public HTML form posts to CRM";
  return "Contact form present on at least one page";
}

function pageSeoCoverage(site: SerializedWebsite): {
  withTitle: number;
  withDescription: number;
  total: number;
} {
  const pages = site.pages ?? [];
  let withTitle = 0;
  let withDescription = 0;
  for (const p of pages) {
    if (p.seo?.title?.trim() || site.seo?.title?.trim()) withTitle += 1;
    if (p.seo?.description?.trim() || site.seo?.description?.trim()) {
      withDescription += 1;
    }
  }
  return { withTitle, withDescription, total: pages.length };
}

export function pickWebsiteForHealthProbe<T extends { status: string }>(
  sites: T[],
): T | null {
  if (!sites.length) return null;
  return sites.find((s) => s.status === "published") ?? sites[0] ?? null;
}

export function buildNativeWebsiteHealth(input: {
  website: SerializedWebsite;
  domain?: NativeHealthDomain;
}): SiteHealthSnapshot {
  const { website, domain } = input;
  const seo = pageSeoCoverage(website);
  const published = website.status === "published";
  const hasDomain = Boolean(domain?.name);
  const sslOk = (domain?.sslState || "").toLowerCase() === "active";
  const dnsOk = Boolean(domain?.dnsConfiguredAt) || sslOk;
  const formOk = hasCrmCapture(website);
  const siteTitleOk = Boolean(website.seo?.title?.trim());
  const siteDescOk = Boolean(website.seo?.description?.trim());
  const pagesSeoTitleOk =
    seo.total === 0 ? false : seo.withTitle === seo.total;
  const pagesSeoDescOk =
    seo.total === 0 ? false : seo.withDescription === seo.total;
  const aliases = (domain?.aliases ?? []).filter(
    (name) => name.toLowerCase() !== domain?.name.toLowerCase(),
  );
  const domainDetail = hasDomain
    ? aliases.length > 0
      ? `${domain!.name} · aliases: ${aliases.join(", ")}`
      : domain!.name
    : "No domain linked — connect via Domains / Make it live";

  const checks: HealthCheck[] = [
    {
      id: "published",
      label: "Published",
      status: published ? "pass" : "warn",
      detail: published
        ? `Live at /sites/${website.slug}`
        : "Still draft — publish from Studio when ready",
    },
    {
      id: "custom_domain",
      label: "Custom domain",
      status: hasDomain ? "pass" : "warn",
      detail: domainDetail,
    },
    {
      id: "dns",
      label: "DNS configured",
      status: !hasDomain ? "warn" : dnsOk ? "pass" : "fail",
      detail: !hasDomain
        ? "Connect a domain first"
        : domain?.dnsConfiguredAt
          ? "Hosting DNS applied"
          : sslOk
            ? "HTTPS live — DNS is resolving"
            : "DNS not applied yet — run Make it live",
    },
    {
      id: "ssl",
      label: "SSL",
      status: !hasDomain ? "warn" : sslOk ? "pass" : "warn",
      detail: !hasDomain
        ? "SSL provisions after domain + DNS"
        : sslOk
          ? "HTTPS active"
          : `SSL state: ${domain?.sslState || "unknown"} — usually active after DNS propagates`,
    },
    {
      id: "form_crm",
      label: "Form → CRM",
      status: formOk ? "pass" : "fail",
      detail: crmCaptureDetail(website, formOk),
    },
    {
      id: "seo_title",
      label: "SEO title",
      status: siteTitleOk && pagesSeoTitleOk ? "pass" : siteTitleOk || seo.withTitle > 0 ? "warn" : "fail",
      detail: siteTitleOk
        ? pagesSeoTitleOk
          ? "Site + page titles set"
          : `${seo.withTitle}/${seo.total} pages have titles`
        : "Set a site title in Studio → SEO",
    },
    {
      id: "seo_description",
      label: "SEO description",
      status:
        siteDescOk && pagesSeoDescOk
          ? "pass"
          : siteDescOk || seo.withDescription > 0
            ? "warn"
            : "fail",
      detail: siteDescOk
        ? pagesSeoDescOk
          ? "Site + page descriptions set"
          : `${seo.withDescription}/${seo.total} pages have descriptions`
        : "Set a meta description in Studio → SEO",
    },
    {
      id: "indexing_ready",
      label: "Search indexing",
      status:
        published && hasDomain && pagesSeoTitleOk && pagesSeoDescOk
          ? "pass"
          : published && hasDomain
            ? "warn"
            : "warn",
      detail: published
        ? hasDomain
          ? `Public at ${domain?.name ?? "custom domain"} · sitemap.xml + robots.txt auto-generated · ${seo.total} pages in Studio`
          : "Publish OK — link a custom domain for search discovery"
        : "Publish the site before expecting search indexing",
    },
    {
      id: "last_updated",
      label: "Last updated",
      status: "pass",
      detail: new Date(website.updatedAt).toLocaleString("en-AU"),
    },
  ];

  const pass = checks.filter((c) => c.status === "pass").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  const scored = checks.filter((c) => c.id !== "last_updated");
  const score = Math.round(
    (scored.reduce((acc, c) => {
      if (c.status === "pass") return acc + 1;
      if (c.status === "warn") return acc + 0.45;
      return acc;
    }, 0) /
      scored.length) *
      100,
  );

  return {
    site: website.name,
    generatedAt: new Date().toISOString(),
    score,
    pass,
    warn,
    fail,
    checks,
    pagespeed: pagespeedFromMetadata(website.metadata),
    ssl: { enabled: sslOk || (!hasDomain && published) },
  };
}

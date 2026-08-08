/**
 * Native Gen 2 website health — Website + InfrastructureDomain signals.
 */

import type {
  HealthCheck,
  SerializedWebsite,
  SiteHealthSnapshot,
} from "./types";

export type NativeHealthDomain = {
  name: string;
  status?: string | null;
  dnsConfiguredAt?: string | Date | null;
  sslState?: string | null;
} | null;

function hasContactForm(site: SerializedWebsite): boolean {
  return (site.pages ?? []).some((p) =>
    p.components.some((c) => c.type === "contact_form"),
  );
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

export function buildNativeWebsiteHealth(input: {
  website: SerializedWebsite;
  domain?: NativeHealthDomain;
}): SiteHealthSnapshot {
  const { website, domain } = input;
  const seo = pageSeoCoverage(website);
  const published = website.status === "published";
  const hasDomain = Boolean(domain?.name);
  const dnsOk = Boolean(domain?.dnsConfiguredAt);
  const sslOk = (domain?.sslState || "").toLowerCase() === "active";
  const formOk = hasContactForm(website);
  const siteTitleOk = Boolean(website.seo?.title?.trim());
  const siteDescOk = Boolean(website.seo?.description?.trim());
  const pagesSeoTitleOk =
    seo.total === 0 ? false : seo.withTitle === seo.total;
  const pagesSeoDescOk =
    seo.total === 0 ? false : seo.withDescription === seo.total;

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
      detail: hasDomain
        ? domain!.name
        : "No domain linked — connect via Domains / Make it live",
    },
    {
      id: "dns",
      label: "DNS configured",
      status: !hasDomain ? "warn" : dnsOk ? "pass" : "fail",
      detail: !hasDomain
        ? "Connect a domain first"
        : dnsOk
          ? "Hosting DNS applied"
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
      detail: formOk
        ? "Contact form present on at least one page"
        : "No contact_form component — add via Studio or regenerate",
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
    pagespeed: { mobile: null, desktop: null, checkedAt: null },
    ssl: { enabled: sslOk || (!hasDomain && published) },
  };
}

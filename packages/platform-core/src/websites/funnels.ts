/**
 * Funnel Builder — single landing page → CRM, plus product subdomain funnels
 * (DigitalGate Business Audit™, Roe Realty Property Report™,
 * Hideaway Circle).
 */

import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import {
  attachDomainToWebsite,
  upsertInfrastructureDomain,
} from "../infrastructure/domains/inventory";
import { resolveOrgBrandTheme } from "../org/brand-theme";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import { getWebsite } from "./crud";
import { component, slugifySiteName } from "./schema";
import type {
  FunnelTemplateId,
  GeneratedSiteModel,
  SerializedWebsite,
  WebsiteTheme,
} from "./types";
import { PRODUCT_FUNNEL_HOSTS } from "./types";

export const FUNNEL_TEMPLATE_OPTIONS: Array<{
  id: FunnelTemplateId;
  label: string;
  detail: string;
  cta: string;
  defaultBrief: string;
}> = [
  {
    id: "lead_capture",
    label: "Lead capture",
    detail: "One landing page → form → CRM enquiry",
    cta: "Get a free consultation",
    defaultBrief:
      "Capture qualified enquiries from a focused landing page — clear offer, one CTA, CRM follow-up.",
  },
  {
    id: "appraisal_request",
    label: "Appraisal request",
    detail: "RE vendor funnel — free appraisal → CRM lead",
    cta: "Book a free appraisal",
    defaultBrief:
      "No-obligation vendor appraisal landing page for real estate — address + goals → CRM.",
  },
  {
    id: "booking_enquiry",
    label: "Booking enquiry",
    detail: "Stay interest → availability enquiry → CRM",
    cta: "Check availability",
    defaultBrief:
      "Accommodation booking enquiry — dates and guests → CRM availability follow-up.",
  },
  {
    id: "business_audit",
    label: "Business Audit",
    detail: "DigitalGate Business Audit™ — scan → score → CRM lead",
    cta: "Get My Free Business Audit →",
    defaultBrief:
      "Dedicated acquisition funnel for website, search, AI visibility, reputation and conversion.",
  },
  {
    id: "property_report",
    label: "Property Report",
    detail: "Roe Realty Property Report™ — address → Cotality → vendor lead",
    cta: "Get Your Free Property Report",
    defaultBrief:
      "Dedicated vendor acquisition funnel — value range, buyer demand and comparable sales.",
  },
  {
    id: "hideaway_circle",
    label: "Hideaway Circle",
    detail: "CVH guest programme — join → CRM + 10% direct-stay reward",
    cta: "Join the Hideaway Circle",
    defaultBrief:
      "Dedicated Hideaway Circle capture — guest CRM, welcome email, 10% off the next direct stay.",
  },
];

export function isFunnelTemplateId(v: unknown): v is FunnelTemplateId {
  return (
    v === "lead_capture" ||
    v === "appraisal_request" ||
    v === "booking_enquiry" ||
    v === "business_audit" ||
    v === "property_report" ||
    v === "hideaway_circle"
  );
}

export function isProductFunnelTemplate(
  v: unknown,
): v is "business_audit" | "property_report" | "hideaway_circle" {
  return (
    v === "business_audit" ||
    v === "property_report" ||
    v === "hideaway_circle"
  );
}

export function isFunnelWebsite(
  website: Pick<SerializedWebsite, "metadata"> | null | undefined,
): boolean {
  const meta = website?.metadata;
  if (!meta || typeof meta !== "object") return false;
  return meta.kind === "funnel" || typeof meta.funnelTemplate === "string";
}

/**
 * Capture pages that live on a brand website (not a dedicated funnel site).
 * Hideaway Circle / stay booking stay on currumbinvalleyhideaway.com.au.
 */
export const BRAND_SITE_CAPTURE_FUNNELS: Array<{
  pageSlug: string;
  template: FunnelTemplateId;
  displayName: string;
  /** When set, only these brand-site slugs. Omit for globally unique page slugs. */
  websiteSlugs?: readonly string[];
}> = [
  {
    pageSlug: "stay",
    template: "booking_enquiry",
    displayName: "Stay booking",
    websiteSlugs: ["currumbin-valley-hideaway"],
  },
];

export type FunnelBuilderItem = {
  id: string;
  websiteId: string;
  name: string;
  slug: string;
  pageSlug: string | null;
  status: string;
  template: FunnelTemplateId | null;
  templateLabel: string;
  href: string;
  studioHref: string;
  deletable: boolean;
  pageCount?: number;
};

export type FunnelBuilderSiteInput = {
  id: string;
  name: string;
  slug: string;
  status: string;
  metadata: Record<string, unknown> | null;
  pageCount?: number;
  pages?: Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
  }>;
};

function funnelTemplateLabel(template: FunnelTemplateId | null): string {
  if (!template) return "funnel";
  return (
    FUNNEL_TEMPLATE_OPTIONS.find((t) => t.id === template)?.label ??
    template.replace(/_/g, " ")
  );
}

function previewHref(
  siteSlug: string,
  pageSlug: string | null,
  published: boolean,
): string {
  const path = pageSlug
    ? `/sites/${siteSlug}/${pageSlug}`
    : `/sites/${siteSlug}`;
  return published ? path : `${path}?preview=1`;
}

function publicPageHref(
  hostname: string | null | undefined,
  pageSlug: string,
  published: boolean,
  fallback: string,
): string {
  if (!published || !hostname) return fallback;
  const host = hostname.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!host) return fallback;
  return `https://${host}/${pageSlug}`;
}

function domainNameForSite(
  site: Pick<FunnelBuilderSiteInput, "id" | "metadata">,
  domains: Array<{ name: string; websiteId: string | null }>,
): string | null {
  const meta = site.metadata ?? {};
  const custom =
    typeof meta.customHostname === "string" ? meta.customHostname.trim() : "";
  if (custom) return custom.replace(/^https?:\/\//, "");
  const product =
    typeof meta.productHost === "string" ? meta.productHost.trim() : "";
  if (product) return product.replace(/^https?:\/\//, "");
  return domains.find((d) => d.websiteId === site.id)?.name ?? null;
}

function matchesBrandCapture(
  site: FunnelBuilderSiteInput,
  pageSlug: string,
  spec: (typeof BRAND_SITE_CAPTURE_FUNNELS)[number],
): boolean {
  if (pageSlug !== spec.pageSlug) return false;
  if (!spec.websiteSlugs?.length) return true;
  return spec.websiteSlugs.includes(site.slug);
}

/** Dedicated funnel websites plus known capture pages on brand sites. */
export function collectFunnelBuilderItems(
  sites: FunnelBuilderSiteInput[],
  domains: Array<{ name: string; websiteId: string | null }> = [],
): FunnelBuilderItem[] {
  const items: FunnelBuilderItem[] = [];
  const seen = new Set<string>();

  for (const site of sites) {
    if (!isFunnelWebsite(site)) continue;
    const template =
      funnelTemplateFromMetadata(site.metadata) ||
      funnelTemplateFromSlug(site.slug);
    const published = site.status === "published";
    items.push({
      id: site.id,
      websiteId: site.id,
      name: site.name,
      slug: site.slug,
      pageSlug: null,
      status: site.status,
      template,
      templateLabel: funnelTemplateLabel(template),
      href: previewHref(site.slug, null, published),
      studioHref: `/apps/websites/studio/${site.id}?live=1`,
      deletable: !isProductFunnelTemplate(template),
      pageCount: site.pageCount,
    });
    seen.add(site.id);
  }

  for (const site of sites) {
    if (isFunnelWebsite(site)) continue;
    const host = domainNameForSite(site, domains);
    for (const spec of BRAND_SITE_CAPTURE_FUNNELS) {
      const page = (site.pages ?? []).find((p) =>
        matchesBrandCapture(site, p.slug, spec),
      );
      if (!page) continue;
      const id = `${site.id}:${page.slug}`;
      if (seen.has(id)) continue;
      const published =
        site.status === "published" && page.status === "published";
      const fallback = previewHref(site.slug, page.slug, published);
      items.push({
        id,
        websiteId: site.id,
        name: spec.displayName || page.title,
        slug: site.slug,
        pageSlug: page.slug,
        status: published ? "published" : page.status,
        template: spec.template,
        templateLabel: funnelTemplateLabel(spec.template),
        href: publicPageHref(host, page.slug, published, fallback),
        studioHref: `/apps/websites/studio/${site.id}?page=${encodeURIComponent(page.slug)}&live=1`,
        deletable: false,
        pageCount: 1,
      });
      seen.add(id);
    }
  }

  return items;
}

export async function listFunnelBuilderItems(
  organisationId: string,
): Promise<FunnelBuilderItem[]> {
  const { prisma } = await import("@dg/database");
  const captureSlugs = BRAND_SITE_CAPTURE_FUNNELS.map((s) => s.pageSlug);
  const [sites, domains] = await Promise.all([
    prisma.website.findMany({
      where: { organisationId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { pages: true } },
        pages: {
          where: { slug: { in: captureSlugs } },
          select: { id: true, slug: true, title: true, status: true },
        },
      },
    }),
    prisma.infrastructureDomain.findMany({
      where: { organisationId },
      select: { name: true, websiteId: true },
    }),
  ]);

  return collectFunnelBuilderItems(
    sites.map((site) => ({
      id: site.id,
      name: site.name,
      slug: site.slug,
      status: site.status,
      metadata: (site.metadata as Record<string, unknown> | null) ?? null,
      pageCount: site._count.pages,
      pages: site.pages,
    })),
    domains,
  );
}

export function funnelTemplateFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): FunnelTemplateId | null {
  let meta: Record<string, unknown> | null | undefined = metadata;
  if (typeof meta === "string") {
    try {
      const parsed = JSON.parse(meta) as unknown;
      meta =
        parsed && typeof parsed === "object"
          ? (parsed as Record<string, unknown>)
          : null;
    } catch {
      return null;
    }
  }
  if (!meta || typeof meta !== "object") return null;
  const raw = meta.funnelTemplate;
  if (isFunnelTemplateId(raw)) return raw;

  // Product subdomain funnels — recover template when funnelTemplate key is missing
  // but productHost / customHostname was still written by ensure scripts.
  const host = [meta.productHost, meta.customHostname]
    .map((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
    .find(Boolean);
  if (host === PRODUCT_FUNNEL_HOSTS.business_audit) return "business_audit";
  if (host === PRODUCT_FUNNEL_HOSTS.property_report) return "property_report";
  if (host === PRODUCT_FUNNEL_HOSTS.hideaway_circle) return "hideaway_circle";
  if (meta.kind === "funnel" && meta.capturePath === "gen2_public_business_audit") {
    return "business_audit";
  }
  if (meta.kind === "funnel" && meta.capturePath === "gen2_public_property_report") {
    return "property_report";
  }
  if (meta.kind === "funnel" && meta.capturePath === "gen2_hideaway_circle") {
    return "hideaway_circle";
  }
  return null;
}

/** Resolve product funnel template from site slug (dedicated funnel websites). */
export function funnelTemplateFromSlug(
  slug: string | null | undefined,
): FunnelTemplateId | null {
  const s = (slug || "").trim().toLowerCase();
  if (!s) return null;
  if (s === "digitalgate-audit" || s.includes("business-audit")) {
    return "business_audit";
  }
  if (s === "roe-realty-report" || s.includes("property-report")) {
    return "property_report";
  }
  if (
    s === "currumbin-valley-hideaway-circle" ||
    s.endsWith("-hideaway-circle")
  ) {
    return "hideaway_circle";
  }
  return null;
}

/** Resolve product funnel template from request hostname. */
export function funnelTemplateFromHostname(
  hostname: string | null | undefined,
): FunnelTemplateId | null {
  const host = (hostname || "").split(":")[0].trim().toLowerCase();
  if (!host) return null;
  if (host === PRODUCT_FUNNEL_HOSTS.business_audit || host.startsWith("audit.")) {
    return "business_audit";
  }
  if (host === PRODUCT_FUNNEL_HOSTS.property_report || host.startsWith("report.")) {
    return "property_report";
  }
  if (
    host === PRODUCT_FUNNEL_HOSTS.hideaway_circle ||
    host.startsWith("circle.currumbinvalleyhideaway.")
  ) {
    return "hideaway_circle";
  }
  return null;
}

/** Best-effort product funnel template resolution for public rendering. */
export function resolveFunnelTemplate(input: {
  metadata?: Record<string, unknown> | null;
  slug?: string | null;
  hostname?: string | null;
}): FunnelTemplateId | null {
  return (
    funnelTemplateFromMetadata(input.metadata) ||
    funnelTemplateFromHostname(input.hostname) ||
    funnelTemplateFromSlug(input.slug) ||
    null
  );
}

function funnelCopy(
  template: FunnelTemplateId,
  name: string,
): {
  title: string;
  headline: string;
  subheadline: string;
  trust: string[];
  formHeadline: string;
  submitLabel: string;
  successMessage: string;
  seoTitle: string;
  seoDescription: string;
  cta: string;
} {
  if (template === "business_audit") {
    return {
      title: "Free Digital Business Audit™",
      headline: "See how your business performs across the digital world",
      subheadline:
        "Get an instant snapshot of your website, search presence, AI visibility and digital foundations — and discover where your business may be losing visibility, enquiries and opportunities.",
      trust: [
        "Website Health",
        "Search Visibility",
        "AI Visibility",
        "Reputation",
        "Conversion Readiness",
      ],
      formHeadline: "Enter your website to start",
      submitLabel: "Get My Free Business Audit →",
      successMessage:
        "Your DigitalGate Business Audit™ is on its way — check your inbox shortly.",
      seoTitle: "Free DigitalGate Business Audit™ | DigitalGate",
      seoDescription:
        "Free DigitalGate Business Audit™ — website health, search, AI visibility, reputation and conversion readiness.",
      cta: "Get My Free Business Audit →",
    };
  }
  if (template === "property_report") {
    return {
      title: "Free Instant Property Report",
      headline: "Find Out What Buyers Would Pay for Your Property Right Now",
      subheadline:
        "Receive a value range, recent comparable sales, and buyer demand insights in minutes.",
      trust: ["Buyer demand analytics", "Instant valuation", "No obligation"],
      formHeadline: "Get Your Free Property Report",
      submitLabel: "Get My Free Report",
      successMessage:
        "Your Property Value & Buyer Demand Report is on its way — check your inbox shortly.",
      seoTitle: "Free Property Report | Roe Realty",
      seoDescription:
        "Get your free Roe Realty Property Report™ — value range, buyer demand and comparable sales.",
      cta: "Get Your Free Property Report",
    };
  }
  if (template === "appraisal_request") {
    return {
      title: "Book a free appraisal",
      headline: `What’s your property worth with ${name}?`,
      subheadline:
        "Book a free, no-obligation appraisal and get a clear local selling plan — usually within one business day.",
      trust: [
        "Local market expertise",
        "No-obligation appraisal",
        "Clear vendor next steps",
      ],
      formHeadline: "Request your free appraisal",
      submitLabel: "Book a free appraisal",
      successMessage:
        "Thanks — we’ll confirm your appraisal and be in touch shortly.",
      seoTitle: `Book a free property appraisal | ${name}`,
      seoDescription: `Request a free, no-obligation property appraisal with ${name}.`,
      cta: "Book a free appraisal",
    };
  }
  if (template === "booking_enquiry") {
    return {
      title: "Check availability",
      headline: `Stay with ${name}`,
      subheadline:
        "Tell us your dates and guests — we’ll confirm what’s available and next steps.",
      trust: ["Guest-ready stays", "Local hospitality", "Fast replies"],
      formHeadline: "Check availability",
      submitLabel: "Send booking enquiry",
      successMessage: "Thanks — we’ll reply with availability shortly.",
      seoTitle: `Check availability | ${name}`,
      seoDescription: `Enquire about staying with ${name}.`,
      cta: "Check availability",
    };
  }
  if (template === "hideaway_circle") {
    return {
      title: "The Hideaway Circle",
      headline: "Come Back to the Valley",
      subheadline:
        "Join the Hideaway Circle and receive 10% off your next direct stay — plus first word on seasonal escapes.",
      trust: ["10% off direct stays", "Guest-only offers", "No spam"],
      formHeadline: "Join the Hideaway Circle",
      submitLabel: "Join the Hideaway Circle",
      successMessage: "Welcome to the Circle — check your inbox for your member details.",
      seoTitle: "The Hideaway Circle | Currumbin Valley Hideaway",
      seoDescription:
        "Join the Hideaway Circle for 10% off your next direct stay at Currumbin Valley Hideaway.",
      cta: "Join the Hideaway Circle",
    };
  }
  return {
    title: "Get in touch",
    headline: `Ready to talk to ${name}?`,
    subheadline:
      "Tell us what you need — we’ll reply with clear next steps. No obligation.",
    trust: ["Fast response", "Clear next steps", "No obligation"],
    formHeadline: "Send your enquiry",
    submitLabel: "Get a free consultation",
    successMessage: "Thanks — we’ll be in touch shortly.",
    seoTitle: `Contact | ${name}`,
    seoDescription: `Enquire with ${name} — free consultation, clear next steps.`,
    cta: "Get a free consultation",
  };
}

function productFunnelCrm(template: FunnelTemplateId) {
  if (template === "business_audit") {
    return {
      createsContact: true,
      createsLead: true,
      leadSource: "free_audit",
      capturePath: "gen2_public_business_audit",
    };
  }
  if (template === "property_report") {
    return {
      createsContact: true,
      createsLead: true,
      leadSource: "property_report",
      capturePath: "gen2_public_property_report",
    };
  }
  if (template === "hideaway_circle") {
    return {
      createsContact: true,
      createsLead: true,
      leadSource: "hideaway_circle",
      capturePath: "gen2_hideaway_circle",
    };
  }
  return {
    createsContact: true,
    createsLead: true,
    leadSource: "website_form",
    capturePath: "website_builder_funnel",
  };
}

export function buildFunnelSiteModel(input: {
  name: string;
  template: FunnelTemplateId;
  theme?: WebsiteTheme | null;
  phone?: string;
  email?: string;
  offer?: string;
}): GeneratedSiteModel {
  const copy = funnelCopy(input.template, input.name);
  const sub = input.offer?.trim() || copy.subheadline;
  const theme: WebsiteTheme = {
    ...(input.theme ?? {}),
    businessName: input.theme?.businessName || input.name,
  };

  // Product funnels: chromeless shell — capture UI is mounted by WebsiteRenderer.
  if (isProductFunnelTemplate(input.template)) {
    return {
      name: `${input.name} — ${copy.title}`,
      theme,
      seo: {
        title: copy.seoTitle,
        description: copy.seoDescription,
        ogTitle: copy.headline,
        ogDescription: sub,
      },
      pages: [
        {
          title: copy.title,
          slug: "home",
          intent: "home",
          seo: {
            title: copy.seoTitle,
            description: copy.seoDescription,
            ogTitle: copy.headline,
            ogDescription: sub,
            showHeader: false,
            showFooter: false,
          },
          components: [],
        },
      ],
    };
  }

  return {
    name: `${input.name} — ${copy.title}`,
    theme,
    seo: {
      title: copy.seoTitle,
      description: copy.seoDescription,
      ogTitle: copy.headline,
      ogDescription: sub,
    },
    pages: [
      {
        title: copy.title,
        slug: "home",
        intent: "home",
        seo: {
          title: copy.seoTitle,
          description: copy.seoDescription,
          ogTitle: copy.headline,
          ogDescription: sub,
        },
        components: [
          component("nav", {
            links: [
              { label: "Home", href: "/" },
              { label: "Enquire", href: "#contact-form" },
            ],
          }),
          component("hero", {
            headline: copy.headline,
            subheadline: sub,
            ctaLabel: copy.cta,
            ctaHref: "#contact-form",
          }),
          component("trust", { items: copy.trust }),
          component("contact_form", {
            headline: copy.formHeadline,
            submitLabel: copy.submitLabel,
            successMessage: copy.successMessage,
          }),
          component("footer", {
            businessName: input.name,
            phone: input.phone ?? null,
            email: input.email ?? null,
          }),
        ],
      },
    ],
  };
}

async function uniqueSlug(base: string): Promise<string> {
  const { prisma } = await import("@dg/database");
  const slug = slugifySiteName(base);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const existing = await prisma.website.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

/**
 * Create a funnel site: one landing page with form → CRM capture path.
 */
export async function createFunnelWebsite(input: {
  organisationId: string;
  organisationName: string;
  actorId?: string;
  template: FunnelTemplateId;
  name?: string;
  brief?: string;
  offer?: string;
  /** Prefer a stable slug (e.g. digitalgate-audit). Falls back to uniqueSlug. */
  preferredSlug?: string;
  /** Publish immediately (product subdomain funnels). */
  publish?: boolean;
}): Promise<{ website: SerializedWebsite }> {
  const { prisma } = await import("@dg/database");
  const profile = await getOrganisationBusinessProfile(input.organisationId);
  const display =
    input.name?.trim() ||
    profile?.tradingName?.trim() ||
    profile?.businessName?.trim() ||
    input.organisationName;

  const brand = resolveOrgBrandTheme({
    organisationName: input.organisationName,
    profile,
  });
  const theme: WebsiteTheme = {
    primaryColor: brand.primaryColor,
    accentColor: brand.accentColor,
    backgroundColor: brand.backgroundColor,
    logoUrl: brand.logoUrl,
    iconUrl: brand.iconUrl,
    businessName: display,
  };

  const model = buildFunnelSiteModel({
    name: display,
    template: input.template,
    theme,
    phone: profile?.businessPhone || profile?.contactPhone || undefined,
    email: profile?.businessEmail || profile?.contactEmail || undefined,
    offer: input.offer || input.brief,
  });

  const option = FUNNEL_TEMPLATE_OPTIONS.find((t) => t.id === input.template);
  const brief =
    input.brief?.trim() ||
    input.offer?.trim() ||
    option?.defaultBrief ||
    null;
  const crm = productFunnelCrm(input.template);
  const preferred = input.preferredSlug?.trim().toLowerCase();
  let slug: string;
  if (preferred) {
    const taken = await prisma.website.findUnique({
      where: { slug: preferred },
      select: { id: true, organisationId: true },
    });
    slug =
      !taken || taken.organisationId === input.organisationId
        ? preferred
        : await uniqueSlug(preferred);
  } else {
    slug = await uniqueSlug(
      `${display}-${input.template.replace(/_/g, "-")}`,
    );
  }

  const status = input.publish ? "published" : "draft";
  const pageStatus = input.publish ? "published" : "draft";

  const existingPreferred =
    preferred &&
    (await prisma.website.findFirst({
      where: { organisationId: input.organisationId, slug: preferred },
      select: { id: true },
    }));

  let siteId: string;
  if (existingPreferred) {
    await prisma.website.update({
      where: { id: existingPreferred.id },
      data: {
        name: model.name || `${display} Funnel`,
        status,
        brief,
        theme: (model.theme ?? undefined) as Prisma.InputJsonValue | undefined,
        seo: (model.seo ?? undefined) as Prisma.InputJsonValue | undefined,
        metadata: {
          kind: "funnel",
          funnelTemplate: input.template,
          capturePath: crm.capturePath,
          productHost:
            isProductFunnelTemplate(input.template)
              ? PRODUCT_FUNNEL_HOSTS[input.template]
              : undefined,
          crm: {
            createsContact: crm.createsContact,
            createsLead: crm.createsLead,
            leadSource: crm.leadSource,
          },
          generatorSource: "funnel_template",
        } as Prisma.InputJsonValue,
      },
    });
    const home = model.pages[0];
    if (home) {
      const existingPage = await prisma.websitePage.findFirst({
        where: { websiteId: existingPreferred.id, slug: "home" },
        select: { id: true },
      });
      if (existingPage) {
        await prisma.websitePage.update({
          where: { id: existingPage.id },
          data: {
            title: home.title,
            intent: "home",
            status: pageStatus,
            seo: (home.seo ?? undefined) as Prisma.InputJsonValue | undefined,
            components: home.components as unknown as Prisma.InputJsonValue,
          },
        });
      } else {
        await prisma.websitePage.create({
          data: {
            websiteId: existingPreferred.id,
            title: home.title,
            slug: "home",
            intent: "home",
            status: pageStatus,
            sortOrder: 0,
            seo: (home.seo ?? undefined) as Prisma.InputJsonValue | undefined,
            components: home.components as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }
    siteId = existingPreferred.id;
  } else {
    const site = await prisma.website.create({
      data: {
        organisationId: input.organisationId,
        name: model.name || `${display} Funnel`,
        slug,
        status,
        brief,
        theme: (model.theme ?? undefined) as Prisma.InputJsonValue | undefined,
        seo: (model.seo ?? undefined) as Prisma.InputJsonValue | undefined,
        metadata: {
          kind: "funnel",
          funnelTemplate: input.template,
          capturePath: crm.capturePath,
          productHost:
            isProductFunnelTemplate(input.template)
              ? PRODUCT_FUNNEL_HOSTS[input.template]
              : undefined,
          crm: {
            createsContact: crm.createsContact,
            createsLead: crm.createsLead,
            leadSource: crm.leadSource,
          },
          generatorSource: "funnel_template",
        } as Prisma.InputJsonValue,
        pages: {
          create: model.pages.map((page, index) => ({
            title: page.title,
            slug: page.slug,
            intent: page.intent ?? "home",
            status: pageStatus,
            sortOrder: index,
            seo: (page.seo ?? undefined) as Prisma.InputJsonValue | undefined,
            components: page.components as unknown as Prisma.InputJsonValue,
          })),
        },
      },
    });
    siteId = site.id;
  }

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: existingPreferred ? "update" : "create",
    entityType: "Website",
    entityId: siteId,
    changes: {
      after: {
        name: model.name,
        slug,
        kind: "funnel",
        funnelTemplate: input.template,
      },
    },
  });

  const website = await getWebsite(input.organisationId, siteId);
  if (!website) {
    throw new Error("Funnel created but could not be loaded");
  }
  return { website };
}

export type ProductFunnelEnsureResult = {
  template: "business_audit" | "property_report" | "hideaway_circle";
  websiteSlug: string;
  websiteId: string;
  hostname: string;
  domainId: string;
  organisationId: string;
};

/**
 * Ensure dedicated product funnel websites + InfrastructureDomain rows exist
 * for audit.digitalgate.com.au, report.roerealty.com.au, and
 * circle.currumbinvalleyhideaway.com.au.
 */
export async function ensureProductFunnelSubdomains(options?: {
  attachVercel?: boolean;
}): Promise<ProductFunnelEnsureResult[]> {
  const { prisma } = await import("@dg/database");
  const { resolveOrgBrandPresetKey } = await import("../org/brand-presets");

  const specs: Array<{
    template: "business_audit" | "property_report" | "hideaway_circle";
    brandPreset: "digitalgate" | "roe-realty" | "cvh";
    preferredSlug: string;
    displayName: string;
    hostname: string;
  }> = [
    {
      template: "business_audit",
      brandPreset: "digitalgate",
      preferredSlug: "digitalgate-audit",
      displayName: "DigitalGate",
      hostname: PRODUCT_FUNNEL_HOSTS.business_audit,
    },
    {
      template: "property_report",
      brandPreset: "roe-realty",
      preferredSlug: "roe-realty-report",
      displayName: "Roe Realty",
      hostname: PRODUCT_FUNNEL_HOSTS.property_report,
    },
    {
      template: "hideaway_circle",
      brandPreset: "cvh",
      preferredSlug: "currumbin-valley-hideaway-circle",
      displayName: "Currumbin Valley Hideaway",
      hostname: PRODUCT_FUNNEL_HOSTS.hideaway_circle,
    },
  ];

  const results: ProductFunnelEnsureResult[] = [];

  for (const spec of specs) {
    const orgs = await prisma.organisation.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        settings: true,
      },
      take: 200,
    });
    const org = orgs.find(
      (o) => resolveOrgBrandPresetKey(o) === spec.brandPreset,
    );
    if (!org) {
      console.warn(
        `[ensure-product-funnels] no org for brand ${spec.brandPreset}`,
      );
      continue;
    }

    const { website } = await createFunnelWebsite({
      organisationId: org.id,
      organisationName: org.name || spec.displayName,
      template: spec.template,
      name: spec.displayName,
      preferredSlug: spec.preferredSlug,
      publish: true,
    });

    const domain = await upsertInfrastructureDomain({
      organisationId: org.id,
      name: spec.hostname,
      status: "connected",
      source: "product_funnel",
      websiteId: website.id,
      managed: false,
    });

    await attachDomainToWebsite({
      organisationId: org.id,
      domainId: domain.id,
      websiteId: website.id,
    });

    if (options?.attachVercel) {
      try {
        const { attachVercelProjectDomain } = await import(
          "../infrastructure/hosting/vercel-domains"
        );
        await attachVercelProjectDomain(spec.hostname);
      } catch (err) {
        console.warn(
          `[ensure-product-funnels] Vercel attach skipped for ${spec.hostname}`,
          err,
        );
      }
    }

    results.push({
      template: spec.template,
      websiteSlug: website.slug,
      websiteId: website.id,
      hostname: spec.hostname,
      domainId: domain.id,
      organisationId: org.id,
    });
  }

  return results;
}

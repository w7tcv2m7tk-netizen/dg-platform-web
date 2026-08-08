/**
 * Funnel Builder v0 — single landing page → contact form → CRM.
 * Thin but real: structured Website asset with form capture metadata.
 */

import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
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
];

export function isFunnelTemplateId(v: unknown): v is FunnelTemplateId {
  return (
    v === "lead_capture" ||
    v === "appraisal_request" ||
    v === "booking_enquiry"
  );
}

export function isFunnelWebsite(
  website: Pick<SerializedWebsite, "metadata"> | null | undefined,
): boolean {
  const meta = website?.metadata;
  if (!meta || typeof meta !== "object") return false;
  return meta.kind === "funnel" || typeof meta.funnelTemplate === "string";
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
  const slug = await uniqueSlug(
    `${display}-${input.template.replace(/_/g, "-")}`,
  );

  const site = await prisma.website.create({
    data: {
      organisationId: input.organisationId,
      name: model.name || `${display} Funnel`,
      slug,
      status: "draft",
      brief,
      theme: (model.theme ?? undefined) as Prisma.InputJsonValue | undefined,
      seo: (model.seo ?? undefined) as Prisma.InputJsonValue | undefined,
      metadata: {
        kind: "funnel",
        funnelTemplate: input.template,
        capturePath: "website_builder_funnel",
        crm: {
          createsContact: true,
          createsLead: true,
          leadSource: "website_form",
        },
        generatorSource: "funnel_template",
      } as Prisma.InputJsonValue,
      pages: {
        create: model.pages.map((page, index) => ({
          title: page.title,
          slug: page.slug,
          intent: page.intent ?? "home",
          status: "draft",
          sortOrder: index,
          seo: (page.seo ?? undefined) as Prisma.InputJsonValue | undefined,
          components: page.components as unknown as Prisma.InputJsonValue,
        })),
      },
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "Website",
    entityId: site.id,
    changes: {
      after: {
        name: site.name,
        slug: site.slug,
        kind: "funnel",
        funnelTemplate: input.template,
      },
    },
  });

  const website = await getWebsite(input.organisationId, site.id);
  if (!website) {
    throw new Error("Funnel created but could not be loaded");
  }
  return { website };
}

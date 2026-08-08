/**
 * AI Site Generator — Business Profile + brief → structured page/component JSON.
 * Falls back to deterministic template when LLM is unavailable.
 */

import { llmChat, llmConfigured } from "../ai/llm";
import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import { parseBrandColours, resolveOrgBrandTheme } from "../org/brand-theme";
import { component, parseGeneratedSiteModel } from "./schema";
import type {
  GeneratedSiteModel,
  WebsiteComponent,
  WebsiteTheme,
} from "./types";

function servicesList(profile: OrganisationBusinessProfile | null): string[] {
  const raw = profile?.brandVoice?.services?.trim();
  if (!raw) return ["Consulting", "Strategy", "Support"];
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function displayName(
  profile: OrganisationBusinessProfile | null,
  orgName: string,
): string {
  return (
    profile?.tradingName?.trim() ||
    profile?.businessName?.trim() ||
    orgName
  );
}

function themeFromProfile(
  profile: OrganisationBusinessProfile | null,
  orgName: string,
): WebsiteTheme {
  const theme = resolveOrgBrandTheme({
    organisationName: orgName,
    profile,
  });
  const colours = parseBrandColours(profile?.brandColours);
  return {
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundColor: theme.backgroundColor || colours[2],
    logoUrl: theme.logoUrl,
    iconUrl: theme.iconUrl,
    businessName: theme.businessName,
    fontHeading: "Fraunces",
    fontBody: "Source Sans 3",
  };
}

function homeComponents(input: {
  name: string;
  tagline: string;
  about: string;
  services: string[];
  ctaLabel: string;
  phone?: string;
  email?: string;
}): WebsiteComponent[] {
  return [
    component("nav", {
      links: [
        { label: "Home", href: "/" },
        { label: "Services", href: "/services" },
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    }),
    component("hero", {
      headline: input.name,
      subheadline: input.tagline,
      ctaLabel: input.ctaLabel,
      ctaHref: "/contact",
    }),
    component("trust", {
      items: ["Local expertise", "Clear communication", "Results-focused"],
    }),
    component("services", {
      headline: "What we do",
      items: input.services.map((title) => ({
        title,
        description: `Professional ${title.toLowerCase()} tailored to your goals.`,
      })),
    }),
    component("about", {
      headline: "About us",
      body: input.about,
    }),
    component("cta", {
      headline: "Ready to get started?",
      body: "Tell us what you need — we’ll respond promptly.",
      buttonLabel: input.ctaLabel,
      buttonHref: "/contact",
    }),
    component("footer", {
      businessName: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
    }),
  ];
}

/** Deterministic MVP site when LLM is off or parse fails */
export function buildTemplateSiteModel(input: {
  organisationName: string;
  profile: OrganisationBusinessProfile | null;
  brief?: string | null;
}): GeneratedSiteModel {
  const name = displayName(input.profile, input.organisationName);
  const services = servicesList(input.profile);
  const tagline =
    input.profile?.brandVoice?.tagline?.trim() ||
    input.brief?.trim()?.slice(0, 140) ||
    `Professional ${input.profile?.industryVertical || "business"} services`;
  const about =
    input.brief?.trim() ||
    input.profile?.brandVoice?.targetAudience?.trim() ||
    `${name} helps clients with ${services.slice(0, 3).join(", ")}.`;
  const ctaLabel =
    input.profile?.industryVertical === "real_estate" ||
    input.profile?.industryVertical === "real-estate"
      ? "Book an appraisal"
      : "Get in touch";
  const phone =
    input.profile?.businessPhone || input.profile?.contactPhone || undefined;
  const email =
    input.profile?.businessEmail || input.profile?.contactEmail || undefined;
  const theme = themeFromProfile(input.profile, input.organisationName);

  return {
    name: `${name} Website`,
    theme,
    seo: {
      title: name,
      description: tagline,
    },
    pages: [
      {
        title: "Home",
        slug: "home",
        intent: "home",
        seo: { title: name, description: tagline },
        components: homeComponents({
          name,
          tagline,
          about,
          services,
          ctaLabel,
          phone,
          email,
        }),
      },
      {
        title: "Services",
        slug: "services",
        intent: "services",
        seo: { title: `Services | ${name}`, description: `Services from ${name}` },
        components: [
          component("nav", {
            links: [
              { label: "Home", href: "/" },
              { label: "Services", href: "/services" },
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" },
            ],
          }),
          component("hero", {
            headline: "Our services",
            subheadline: `How ${name} helps you grow`,
            ctaLabel,
            ctaHref: "/contact",
          }),
          component("services", {
            headline: "Services",
            items: services.map((title) => ({
              title,
              description: `Expert ${title.toLowerCase()} for your business.`,
            })),
          }),
          component("cta", {
            headline: "Let’s talk",
            body: "Share your goals and we’ll outline next steps.",
            buttonLabel: ctaLabel,
            buttonHref: "/contact",
          }),
          component("footer", { businessName: name, phone, email }),
        ],
      },
      {
        title: "About",
        slug: "about",
        intent: "about",
        seo: { title: `About | ${name}`, description: about.slice(0, 160) },
        components: [
          component("nav", {
            links: [
              { label: "Home", href: "/" },
              { label: "Services", href: "/services" },
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" },
            ],
          }),
          component("hero", {
            headline: `About ${name}`,
            subheadline: tagline,
            ctaLabel,
            ctaHref: "/contact",
          }),
          component("about", { headline: "Our story", body: about }),
          component("footer", { businessName: name, phone, email }),
        ],
      },
      {
        title: "Contact",
        slug: "contact",
        intent: "contact",
        seo: { title: `Contact | ${name}`, description: `Contact ${name}` },
        components: [
          component("nav", {
            links: [
              { label: "Home", href: "/" },
              { label: "Services", href: "/services" },
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" },
            ],
          }),
          component("hero", {
            headline: "Contact us",
            subheadline: "We’d love to hear from you",
            ctaLabel: "Send a message",
            ctaHref: "#contact-form",
          }),
          component("contact_form", {
            headline: "Send a message",
            submitLabel: "Submit",
            successMessage: "Thanks — we’ll be in touch shortly.",
          }),
          component("footer", { businessName: name, phone, email }),
        ],
      },
    ],
  };
}

export async function generateSiteModel(input: {
  organisationName: string;
  profile: OrganisationBusinessProfile | null;
  brief?: string | null;
}): Promise<{ model: GeneratedSiteModel; source: "llm" | "template"; error?: string }> {
  const fallback = buildTemplateSiteModel(input);

  if (!llmConfigured()) {
    return { model: fallback, source: "template" };
  }

  const name = displayName(input.profile, input.organisationName);
  const services = servicesList(input.profile);
  const theme = themeFromProfile(input.profile, input.organisationName);

  try {
    const result = await llmChat({
      maxTokens: 4000,
      messages: [
        {
          role: "system",
          content: [
            "You are DigitalGate AI Website Generator.",
            "Emit ONLY valid JSON for a structured website model — never raw HTML.",
            "Schema: { name?, seo?: {title, description}, theme?: {}, pages: [{ title, slug, intent, seo?, components: [{ id?, type, props }] }] }",
            `Allowed component types: nav, hero, trust, services, about, testimonials, cta, faq, contact_form, footer.`,
            "Include pages: home, services, about, contact. Contact page must include contact_form.",
            "Use Australian English (en-AU). Do not invent awards or false claims.",
            "Match brand voice from the profile. Keep copy concise.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              businessName: name,
              industry: input.profile?.industryVertical,
              services,
              tagline: input.profile?.brandVoice?.tagline,
              tone: input.profile?.brandVoice?.tone,
              targetAudience: input.profile?.brandVoice?.targetAudience,
              locations: input.profile?.locations,
              contact: {
                phone: input.profile?.businessPhone || input.profile?.contactPhone,
                email: input.profile?.businessEmail || input.profile?.contactEmail,
              },
              theme,
              brief: input.brief?.trim() || null,
            },
            null,
            2,
          ),
        },
      ],
    });

    const parsed = parseGeneratedSiteModel(result.text);
    if (!parsed) {
      return {
        model: fallback,
        source: "template",
        error: "LLM returned unparseable JSON — used template",
      };
    }

    // Ensure theme from profile wins when AI omits colours
    parsed.theme = { ...theme, ...parsed.theme };
    return { model: parsed, source: "llm" };
  } catch (err) {
    return {
      model: fallback,
      source: "template",
      error: err instanceof Error ? err.message : "LLM error",
    };
  }
}

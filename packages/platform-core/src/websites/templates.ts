/**
 * Industry-aware starter site structures (typed components, not HTML).
 */

import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import { component } from "./schema";
import type {
  GeneratedSiteModel,
  WebsiteComponent,
  WebsiteTemplateId,
  WebsiteTheme,
} from "./types";

export function resolveWebsiteTemplateId(input: {
  explicit?: WebsiteTemplateId | "auto" | null;
  industryVertical?: string | null;
  enabledAppIds?: string[];
}): WebsiteTemplateId {
  if (input.explicit && input.explicit !== "auto") return input.explicit;

  const vertical = (input.industryVertical || "").toLowerCase().replace(/-/g, "_");
  const apps = new Set(input.enabledAppIds ?? []);

  if (
    vertical.includes("accommodation") ||
    vertical.includes("hospitality") ||
    apps.has("accommodation")
  ) {
    return "accommodation";
  }
  if (
    vertical.includes("real_estate") ||
    vertical.includes("realestate") ||
    vertical === "property" ||
    apps.has("real-estate")
  ) {
    return "real_estate";
  }
  return "generic";
}

function navLinks(
  links: Array<{ label: string; href: string }>,
): WebsiteComponent {
  return component("nav", { links });
}

function footer(
  name: string,
  phone?: string,
  email?: string,
): WebsiteComponent {
  return component("footer", {
    businessName: name,
    phone: phone ?? null,
    email: email ?? null,
  });
}

export function buildIndustrySiteModel(input: {
  name: string;
  tagline: string;
  about: string;
  services: string[];
  phone?: string;
  email?: string;
  theme: WebsiteTheme;
  template: WebsiteTemplateId;
}): GeneratedSiteModel {
  const { name, tagline, about, services, phone, email, theme, template } =
    input;

  if (template === "real_estate") {
    const cta = "Book a free appraisal";
    const links = [
      { label: "Home", href: "/" },
      { label: "Listings", href: "/listings" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ];
    return {
      name: `${name} Website`,
      theme,
      seo: {
        title: `${name} | Local real estate`,
        description: tagline,
        ogTitle: name,
        ogDescription: tagline,
      },
      pages: [
        {
          title: "Home",
          slug: "home",
          intent: "home",
          seo: {
            title: name,
            description: tagline,
            ogTitle: name,
            ogDescription: tagline,
          },
          components: [
            navLinks(links),
            component("hero", {
              headline: name,
              subheadline: tagline,
              ctaLabel: cta,
              ctaHref: "/contact",
            }),
            component("trust", {
              items: [
                "Local market expertise",
                "No-obligation appraisal",
                "Clear vendor next steps",
              ],
            }),
            component("services", {
              headline: "How we help",
              items: (services.length
                ? services
                : ["Vendor appraisals", "Buyer representation", "Property marketing"]
              ).map((title) => ({
                title,
                description: `Professional ${title.toLowerCase()} for local vendors and buyers.`,
              })),
            }),
            component("cta", {
              headline: "Thinking of selling?",
              body: "Book a free, no-obligation appraisal and get a clear plan for your property.",
              buttonLabel: cta,
              buttonHref: "/contact",
            }),
            footer(name, phone, email),
          ],
        },
        {
          title: "Listings",
          slug: "listings",
          intent: "listings",
          seo: {
            title: `Listings & appraisals | ${name}`,
            description: `Current listings and appraisal enquiries with ${name}.`,
          },
          components: [
            navLinks(links),
            component("hero", {
              headline: "Listings & appraisals",
              subheadline: `Explore opportunities or book a free appraisal with ${name}.`,
              ctaLabel: cta,
              ctaHref: "/contact",
            }),
            component("services", {
              headline: "Featured focus",
              items: [
                {
                  title: "For sale",
                  description:
                    "Browse marketed properties — connect listings from Real Estate when ready.",
                },
                {
                  title: "Vendor appraisals",
                  description:
                    "Get a clear market appraisal and a tailored selling strategy.",
                },
                {
                  title: "Buyer advisory",
                  description:
                    "Tell us what you’re looking for and we’ll keep you in the loop.",
                },
              ],
            }),
            component("cta", {
              headline: "Book a free appraisal",
              body: "Share your address and goals — we’ll respond promptly.",
              buttonLabel: cta,
              buttonHref: "/contact",
            }),
            footer(name, phone, email),
          ],
        },
        {
          title: "About",
          slug: "about",
          intent: "about",
          seo: {
            title: `About | ${name}`,
            description: about.slice(0, 160),
          },
          components: [
            navLinks(links),
            component("hero", {
              headline: `About ${name}`,
              subheadline: tagline,
              ctaLabel: cta,
              ctaHref: "/contact",
            }),
            component("about", { headline: "Our story", body: about }),
            footer(name, phone, email),
          ],
        },
        {
          title: "Contact",
          slug: "contact",
          intent: "contact",
          seo: {
            title: `Contact | ${name}`,
            description: `Contact ${name} for free appraisals and listings.`,
          },
          components: [
            navLinks(links),
            component("hero", {
              headline: "Book a free appraisal",
              subheadline: "No obligation — or ask about a property",
              ctaLabel: cta,
              ctaHref: "#contact-form",
            }),
            component("contact_form", {
              headline: "Request your free appraisal",
              submitLabel: "Book a free appraisal",
              successMessage:
                "Thanks — we’ll confirm your appraisal and be in touch shortly.",
            }),
            footer(name, phone, email),
          ],
        },
      ],
    };
  }

  if (template === "accommodation") {
    const cta = "Check availability";
    const links = [
      { label: "Home", href: "/" },
      { label: "Stay", href: "/stay" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ];
    return {
      name: `${name} Website`,
      theme,
      seo: {
        title: `${name} | Stay with us`,
        description: tagline,
        ogTitle: name,
        ogDescription: tagline,
      },
      pages: [
        {
          title: "Home",
          slug: "home",
          intent: "home",
          seo: {
            title: name,
            description: tagline,
            ogTitle: name,
            ogDescription: tagline,
          },
          components: [
            navLinks(links),
            component("hero", {
              headline: name,
              subheadline: tagline,
              ctaLabel: cta,
              ctaHref: "/stay",
            }),
            component("trust", {
              items: ["Comfortable stays", "Local hospitality", "Easy booking"],
            }),
            component("about", {
              headline: "Welcome",
              body: about,
            }),
            component("cta", {
              headline: "Ready to book?",
              body: "Check stay options and enquire about availability.",
              buttonLabel: cta,
              buttonHref: "/stay",
            }),
            footer(name, phone, email),
          ],
        },
        {
          title: "Stay",
          slug: "stay",
          intent: "stay",
          seo: {
            title: `Stay / units | ${name}`,
            description: `Units and stay options at ${name}.`,
          },
          components: [
            navLinks(links),
            component("hero", {
              headline: "Stay with us",
              subheadline: `Units and stays at ${name}`,
              ctaLabel: "Enquire to book",
              ctaHref: "/contact",
            }),
            component("services", {
              headline: "Units & stays",
              items: (services.length
                ? services
                : ["Studio", "One bedroom", "Two bedroom"]
              ).map((title) => ({
                title,
                description: `Comfortable ${title.toLowerCase()} with everything you need for a great stay.`,
              })),
            }),
            component("cta", {
              headline: "Check availability",
              body: "Tell us your dates and guests — we’ll confirm what’s free.",
              buttonLabel: "Enquire to book",
              buttonHref: "/contact",
            }),
            footer(name, phone, email),
          ],
        },
        {
          title: "About",
          slug: "about",
          intent: "about",
          seo: {
            title: `About | ${name}`,
            description: about.slice(0, 160),
          },
          components: [
            navLinks(links),
            component("hero", {
              headline: `About ${name}`,
              subheadline: tagline,
              ctaLabel: cta,
              ctaHref: "/contact",
            }),
            component("about", { headline: "Our place", body: about }),
            footer(name, phone, email),
          ],
        },
        {
          title: "Contact",
          slug: "contact",
          intent: "contact",
          seo: {
            title: `Contact | ${name}`,
            description: `Contact ${name} to book your stay.`,
          },
          components: [
            navLinks(links),
            component("hero", {
              headline: "Contact / book",
              subheadline: "Ask about dates, units, and rates",
              ctaLabel: "Send enquiry",
              ctaHref: "#contact-form",
            }),
            component("contact_form", {
              headline: "Booking enquiry",
              submitLabel: "Send enquiry",
              successMessage: "Thanks — we’ll confirm availability shortly.",
            }),
            footer(name, phone, email),
          ],
        },
      ],
    };
  }

  // Generic / services
  const cta = "Get in touch";
  const links = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];
  return {
    name: `${name} Website`,
    theme,
    seo: {
      title: name,
      description: tagline,
      ogTitle: name,
      ogDescription: tagline,
    },
    pages: [
      {
        title: "Home",
        slug: "home",
        intent: "home",
        seo: { title: name, description: tagline },
        components: [
          navLinks(links),
          component("hero", {
            headline: name,
            subheadline: tagline,
            ctaLabel: cta,
            ctaHref: "/contact",
          }),
          component("trust", {
            items: ["Local expertise", "Clear communication", "Results-focused"],
          }),
          component("services", {
            headline: "What we do",
            items: services.map((title) => ({
              title,
              description: `Professional ${title.toLowerCase()} tailored to your goals.`,
            })),
          }),
          component("about", { headline: "About us", body: about }),
          component("cta", {
            headline: "Ready to get started?",
            body: "Tell us what you need — we’ll respond promptly.",
            buttonLabel: cta,
            buttonHref: "/contact",
          }),
          footer(name, phone, email),
        ],
      },
      {
        title: "Services",
        slug: "services",
        intent: "services",
        seo: {
          title: `Services | ${name}`,
          description: `Services from ${name}`,
        },
        components: [
          navLinks(links),
          component("hero", {
            headline: "Our services",
            subheadline: `How ${name} helps you grow`,
            ctaLabel: cta,
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
            buttonLabel: cta,
            buttonHref: "/contact",
          }),
          footer(name, phone, email),
        ],
      },
      {
        title: "About",
        slug: "about",
        intent: "about",
        seo: {
          title: `About | ${name}`,
          description: about.slice(0, 160),
        },
        components: [
          navLinks(links),
          component("hero", {
            headline: `About ${name}`,
            subheadline: tagline,
            ctaLabel: cta,
            ctaHref: "/contact",
          }),
          component("about", { headline: "Our story", body: about }),
          footer(name, phone, email),
        ],
      },
      {
        title: "Contact",
        slug: "contact",
        intent: "contact",
        seo: {
          title: `Contact | ${name}`,
          description: `Contact ${name}`,
        },
        components: [
          navLinks(links),
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
          footer(name, phone, email),
        ],
      },
    ],
  };
}

export function suggestTemplateFromProfile(
  profile: OrganisationBusinessProfile | null,
  enabledAppIds?: string[],
): WebsiteTemplateId {
  return resolveWebsiteTemplateId({
    explicit: "auto",
    industryVertical: profile?.industryVertical,
    enabledAppIds,
  });
}

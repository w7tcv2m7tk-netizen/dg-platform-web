/**
 * Wantd / demand-first marketplace starter site.
 * Clean, editorial, property-first — designed to expand beyond real estate.
 * @see docs/WANTD.md
 */

import {
  WANTD_CATEGORIES,
  WANTD_COLOURS,
  WANTD_NAV,
  WANTD_SUPPORTING,
  WANTD_TAGLINE,
} from "../wantd/brand";
import { component } from "./schema";
import type {
  GeneratedSiteModel,
  WebsiteComponent,
  WebsiteSeo,
  WebsiteTheme,
} from "./types";

function seo(
  title: string,
  description: string,
  keywords: string[],
): WebsiteSeo {
  return {
    title,
    description,
    keywords,
    ogTitle: title,
    ogDescription: description,
  };
}

function navLinks(): WebsiteComponent {
  return component("nav", {
    links: [
      { label: "Home", href: "/" },
      ...WANTD_NAV,
    ],
  });
}

function siteFooter(email?: string): WebsiteComponent {
  return component("footer", {
    businessName: "Wantd",
    email: email ?? "hello@wantdproperty.com.au",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  });
}

const TRUST = [
  "Tell us once",
  "We match supply to your Want",
  "Property is live — more categories next",
];

export function wantdWebsiteTheme(input?: {
  logoUrl?: string;
  iconUrl?: string;
}): WebsiteTheme {
  return {
    primaryColor: WANTD_COLOURS.accent,
    accentColor: WANTD_COLOURS.ink,
    backgroundColor: WANTD_COLOURS.cream,
    businessName: "Wantd",
    fontHeading: "Syne",
    fontBody: "Outfit",
    logoUrl: input?.logoUrl,
    iconUrl: input?.iconUrl || "/brand/wantd-icon.png",
  };
}

export function buildMarketplaceSiteModel(input: {
  name: string;
  tagline?: string;
  about?: string;
  phone?: string;
  email?: string;
  theme?: WebsiteTheme;
}): GeneratedSiteModel {
  const name = input.name || "Wantd";
  const tagline = input.tagline?.trim() || WANTD_TAGLINE;
  const email = input.email;
  const phone = input.phone;
  const theme = input.theme ?? wantdWebsiteTheme();
  const about =
    input.about?.trim() ||
    "Wantd reverses the usual marketplace. You don’t browse thousands of listings. You say what you want — a home, a car, a stay, a specialist — and we find the match. Property is first. The rest of life follows.";

  const categories = WANTD_CATEGORIES.map((cat) => ({
    title: cat.label,
    description:
      cat.id === "property"
        ? "Live now — post a property Want and we’ll start matching."
        : "Coming next. Post a Want anyway and we’ll keep you in the loop.",
  }));

  const footer = siteFooter(email);
  const nav = navLinks();

  return {
    name: `${name} Website`,
    theme,
    seo: seo(
      "Wantd | Tell the market what you WANT",
      "The easy marketplace for NZ & Australia. Post what you’re looking for — property first — and Wantd matches supply to your Want. Fun, fast, no endless scrolling.",
      [
        "wantd",
        "wantd.co.nz",
        "post a want",
        "demand marketplace",
        "property want",
        "buy house new zealand",
        "first home buyer",
      ],
    ),
    pages: [
      {
        title: "Home",
        slug: "home",
        intent: "home",
        seo: seo(
          "Wantd | What are you looking for?",
          "Skip the scroll. Tell Wantd what you WANT — we’ll match you with the right place, people, or thing. Property Wants are live in NZ & Australia.",
          [
            "wantd",
            "what are you looking for",
            "property marketplace nz",
            "post a property want",
            "wantd.co.nz",
          ],
        ),
        components: [
          nav,
          component("hero", {
            headline: "What do you want?",
            subheadline: `Looking for property? Start with what you want. ${WANTD_SUPPORTING}`,
            ctaLabel: "Tell us what you want",
            ctaHref: "/post-a-want",
          }),
          component("trust", { items: TRUST }),
          component("cta", {
            headline: "Stop searching. Start wanting.",
            body: "Property Wants are live. Tell us once — we take it from there.",
            buttonLabel: "Tell us what you want",
            buttonHref: "/post-a-want",
          }),
          footer,
        ],
      },
      {
        title: "How it works",
        slug: "how-it-works",
        intent: "custom",
        seo: seo(
          "How Wantd works | Post a Want, get matched",
          "Three steps: say what you WANT, we match real supply, you choose the next move. No listing overload. Property matching is live now.",
          ["how wantd works", "post a want", "property matching", "demand first marketplace"],
        ),
        components: [
          nav,
          component("hero", {
            headline: "How it works",
            subheadline: "Tell us what you want. We’ll find it.",
            ctaLabel: "Tell us what you want",
            ctaHref: "/post-a-want",
          }),
          component("services", {
            headline: "That’s it",
            items: [
              {
                title: "1. Tell us",
                description:
                  "Say it in your own words — or answer a few short questions. Under a minute.",
              },
              {
                title: "2. We look",
                description:
                  "Wantd matches relevant supply to your Want. You don’t scroll a feed.",
              },
              {
                title: "3. We find it",
                description:
                  "When something fits, we show you why. You decide the next move.",
              },
            ],
          }),
          component("cta", {
            headline: "Ready when you are",
            body: "Property is live. Other categories are next.",
            buttonLabel: "Tell us what you want",
            buttonHref: "/post-a-want",
          }),
          footer,
        ],
      },
      {
        title: "Post a Want",
        slug: "post-a-want",
        intent: "custom",
        seo: seo(
          "Tell us what you want | Wantd",
          "Tell Wantd what you’re looking for. Property is live — buy, rent, or invest. We’ll take it from there.",
          [
            "tell us what you want",
            "post a want",
            "property want",
            "wantd property",
          ],
        ),
        components: [
          nav,
          component("hero", {
            headline: "Tell us what you want",
            subheadline:
              "Property is live. Say it naturally — we’ll start matching.",
          }),
          component("contact_form", {
            headline: "Your Want",
            submitLabel: "Find it",
            successMessage: "Got it. We’re on it.",
          }),
          footer,
        ],
      },
      {
        title: "For agents",
        slug: "for-agents",
        intent: "custom",
        seo: seo(
          "For agents | Wantd",
          "Buyers tell Wantd what they want. If you have something that matches, say so.",
          ["wantd for agents", "property demand", "wantd suppliers"],
        ),
        components: [
          nav,
          component("hero", {
            headline: "New Wantd",
            subheadline:
              "Buyers speak first. If you have something that matches, tell us.",
            ctaLabel: "I have something that matches",
            ctaHref: "/contact",
          }),
          component("about", {
            headline: "The reverse of advertising",
            body: "Instead of hoping the right buyer finds your listing, Wantd brings you people who already know what they want — suburb, budget, timing. Property is live now.",
          }),
          footer,
        ],
      },
      {
        title: "Categories",
        slug: "categories",
        intent: "custom",
        seo: seo(
          "Wantd categories | Property live, more coming",
          "Browse Wantd categories. Property Wants are live in New Zealand and Australia. Cars, jobs, services and more are on the way.",
          ["wantd categories", "property wants", "cars jobs services marketplace"],
        ),
        components: [
          nav,
          component("hero", {
            headline: "Categories",
            subheadline: "Property first. The rest of life next.",
            ctaLabel: "Post a Want",
            ctaHref: "/post-a-want",
          }),
          component("services", {
            headline: "What’s on Wantd",
            items: categories,
          }),
          footer,
        ],
      },
      {
        title: "About",
        slug: "about",
        intent: "about",
        seo: seo(
          "About Wantd | A demand-first marketplace",
          "Wantd is a demand-first marketplace: you post what you WANT, we match supply. Designed to feel fun and easy — especially if you’re just getting started.",
          ["about wantd", "demand first marketplace", "wantd property"],
        ),
        components: [
          nav,
          component("hero", {
            headline: "About Wantd",
            subheadline: tagline,
            ctaLabel: "Post a Want",
            ctaHref: "/post-a-want",
          }),
          component("about", {
            headline: "Listings got loud. Wants got ignored.",
            body: about,
          }),
          component("about", {
            headline: "NZ + Australia",
            body: "Home base is wantd.co.nz. Property matching runs across New Zealand and Australia. Same idea: you speak first.",
          }),
          footer,
        ],
      },
      {
        title: "FAQ",
        slug: "faq",
        intent: "custom",
        seo: seo(
          "Wantd FAQ | Is it free? How matching works",
          "Answers about posting a Want, fees, privacy, and what happens after you submit. Wantd is free to post. Property matching is live.",
          ["wantd faq", "is wantd free", "property matching questions"],
        ),
        components: [
          nav,
          component("hero", {
            headline: "Questions, short answers",
            subheadline: "No fine print vibe.",
            ctaLabel: "Still stuck? Contact us",
            ctaHref: "/contact",
          }),
          component("faq", {
            headline: "FAQ",
            items: [
              {
                q: "Is it free to post a Want?",
                a: "Yes. Telling the market what you want is free.",
              },
              {
                q: "Do I have to be young to use Wantd?",
                a: "Nope. The site is built to feel easy for first-timers — and still useful if you’ve done this a dozen times.",
              },
              {
                q: "What’s live today?",
                a: "Property Wants — buy, rent, or invest. Other categories are on the way; you can still tell us what you want.",
              },
              {
                q: "Is this an app I have to download?",
                a: "No. Use wantd.co.nz in the browser. We’ll email or call when there’s a match.",
              },
              {
                q: "Who sees my Want?",
                a: "The Wantd team, then relevant matches we intro you to. We don’t dump your details into a public listing.",
              },
            ],
          }),
          footer,
        ],
      },
      {
        title: "Contact",
        slug: "contact",
        intent: "contact",
        seo: seo(
          "Contact Wantd | hello from wantd.co.nz",
          "Message the Wantd team. Questions about a Want, matching, or partnerships — we actually read these.",
          ["contact wantd", "wantd support", "hello@wantdproperty.com.au"],
        ),
        components: [
          nav,
          component("hero", {
            headline: "Say hey",
            subheadline: phone
              ? `Email or the form is perfect. Prefer a call? ${phone}.`
              : "Email or the form. We’ll get back to you.",
            ctaLabel: "Send a message",
            ctaHref: "#contact-form",
          }),
          component("contact_form", {
            headline: "Message Wantd",
            submitLabel: "Send",
            successMessage: "Got it — we’ll reply soon.",
          }),
          footer,
        ],
      },
      {
        title: "Privacy",
        slug: "privacy",
        intent: "custom",
        seo: seo(
          "Privacy | Wantd",
          "How Wantd collects and uses your Want details. We match privately — we don’t publish your brief as a public listing.",
          ["wantd privacy", "wantd data"],
        ),
        components: [
          nav,
          component("hero", {
            headline: "Privacy",
            subheadline: "Your Want isn’t a billboard.",
          }),
          component("about", {
            headline: "What we collect",
            body: "Name, contact details, and what you told us you’re looking for. We use that to match supply and to get in touch. We don’t sell your Want to random advertisers.",
          }),
          component("about", {
            headline: "Questions",
            body: `Email ${email ?? "hello@wantdproperty.com.au"} and we’ll explain anything in plain language.`,
          }),
          footer,
        ],
      },
      {
        title: "Terms",
        slug: "terms",
        intent: "custom",
        seo: seo(
          "Terms | Wantd",
          "Simple terms for using Wantd. Matching is curated. We don’t guarantee a property, price, or timeline.",
          ["wantd terms", "wantd conditions"],
        ),
        components: [
          nav,
          component("hero", {
            headline: "Terms",
            subheadline: "Keep it fair. Keep it simple.",
          }),
          component("about", {
            headline: "Using Wantd",
            body: "Posting a Want is an enquiry, not a contract. Matching is curated and availability changes. Always do your own due diligence on any property, seller, or service we introduce.",
          }),
          footer,
        ],
      },
    ],
  };
}

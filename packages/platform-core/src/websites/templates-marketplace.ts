/**
 * Wantd / demand-first marketplace starter site.
 * Fun, easy, younger-first copy — still clear for any age.
 * @see docs/WANTD.md
 */

import { WANTD_CATEGORIES, WANTD_COLOURS, WANTD_TAGLINE } from "../wantd/brand";
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
      { label: "How it works", href: "/how-it-works" },
      { label: "Post a Want", href: "/post-a-want" },
      { label: "About", href: "/about" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
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
  "Post what you want in minutes",
  "A real person matches you — not a spam feed",
  "Free to tell the market what you’re after",
];

export function wantdWebsiteTheme(input?: {
  logoUrl?: string;
  iconUrl?: string;
}): WebsiteTheme {
  return {
    primaryColor: WANTD_COLOURS.westernRed,
    accentColor: WANTD_COLOURS.brassGold,
    backgroundColor: WANTD_COLOURS.cream,
    businessName: "Wantd",
    fontHeading: "Fraunces",
    fontBody: "Source Sans 3",
    logoUrl: input?.logoUrl,
    iconUrl: input?.iconUrl,
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
    "Wantd flips the usual marketplace. You don’t scroll forever hoping the right thing appears. You say what you WANT — a first home, a car, a side-hustle gig — and we hunt the match. Built for people who’d rather keep it simple: young buyers, first-timers, and anyone who’s tired of noisy listings.";

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
            headline: "What are you looking for?",
            subheadline: `${tagline} Post it once. We do the hunting.`,
            ctaLabel: "Post a Want",
            ctaHref: "/post-a-want",
          }),
          component("trust", { items: TRUST }),
          component("services", {
            headline: "Start wherever you are",
            items: categories,
          }),
          component("about", {
            headline: "Made to feel easy",
            body: "Wantd is for first homes and fifth homes, first cars and curious browsers. Short form. Plain language. A human on the other side. Property is live today — more categories are rolling out.",
          }),
          component("cta", {
            headline: "Got a Want in your head?",
            body: "Dump it here. We’ll take it from there.",
            buttonLabel: "Post a Want",
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
            subheadline: "Three steps. Zero scroll-fatigue.",
            ctaLabel: "Post a Want",
            ctaHref: "/post-a-want",
          }),
          component("services", {
            headline: "That’s it",
            items: [
              {
                title: "1. Spill the Want",
                description:
                  "What, where, budget-ish, timeline. Phone or email is enough. Takes a couple of minutes.",
              },
              {
                title: "2. We hunt",
                description:
                  "A person reviews your Want and matches relevant supply. Not a bot blasting your inbox.",
              },
              {
                title: "3. You decide",
                description:
                  "If something fits, we intro. Inspect, negotiate, or pass — you’re in control.",
              },
            ],
          }),
          component("cta", {
            headline: "Ready when you are",
            body: "Property Wants are live. Other categories are warming up.",
            buttonLabel: "Post a property Want",
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
          "Post a Want | Wantd NZ & Australia",
          "Tell Wantd what you’re looking for. Property Wants are live — homes to buy, rent, or invest. Free to post. Easy form. Human matching.",
          [
            "post a want",
            "property want nz",
            "buy house australia",
            "first home want",
            "wantd property",
          ],
        ),
        components: [
          nav,
          component("hero", {
            headline: "Post what you WANT",
            subheadline:
              "Property is live. Drop the must-haves — suburbs, budget, vibe — and we’ll start matching.",
            ctaLabel: "Jump to the form",
            ctaHref: "#contact-form",
          }),
          component("about", {
            headline: "Keep it casual",
            body: "Don’t write an essay. “Two-bed in Tauranga under 800k, sunny, near a bus” is a great Want. We’ll ask if we need more.",
          }),
          component("contact_form", {
            headline: "Your Want",
            submitLabel: "Send my Want",
            successMessage:
              "Got it — thanks. A human will review and start matching. We’ll be in touch.",
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

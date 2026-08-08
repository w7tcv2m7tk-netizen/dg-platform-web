/**
 * Natural-language Studio edits → structured model patches (not HTML dumps).
 */

import { llmChat, llmConfigured } from "../ai/llm";
import { createWebsitePage, getWebsite, updateWebsite, updateWebsitePage } from "./crud";
import { component, normalizeComponents } from "./schema";
import type { SerializedWebsite, WebsiteComponent } from "./types";

export type WebsiteAssistResult = {
  website: SerializedWebsite;
  applied: string;
  source: "llm" | "heuristic";
  error?: string;
};

type HeuristicPatch =
  | {
      kind: "add_page";
      page: {
        title: string;
        slug: string;
        intent: string;
        components: WebsiteComponent[];
      };
    }
  | { kind: "change_cta"; ctaLabel: string }
  | { kind: "change_headline"; headline: string }
  | { kind: "change_subheadline"; subheadline: string }
  | { kind: "make_premium" }
  | { kind: "set_primary_color"; color: string }
  | { kind: "ai_visibility" }
  | { kind: "noop" };

function navLinks(active?: string) {
  const links = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];
  if (active === "faq") {
    links.splice(3, 0, { label: "FAQ", href: "/faq" });
  }
  return links;
}

function heuristicPatch(
  website: SerializedWebsite,
  prompt: string,
): HeuristicPatch {
  const lower = prompt.toLowerCase().trim();
  const name = website.theme?.businessName || website.name;

  if (
    /add\s+(a\s+)?services?\s+page/.test(lower) ||
    /create\s+(a\s+)?services?\s+page/.test(lower)
  ) {
    return {
      kind: "add_page",
      page: {
        title: "Services",
        slug: "services",
        intent: "services",
        components: [
          component("nav", { links: navLinks() }),
          component("hero", {
            headline: "Our services",
            subheadline: `How ${name} helps you`,
            ctaLabel: "Get in touch",
            ctaHref: "/contact",
          }),
          component("services", {
            headline: "Services",
            items: [
              { title: "Core service", description: "Describe your primary offer." },
              { title: "Advisory", description: "Strategy and guidance." },
              { title: "Support", description: "Ongoing help when you need it." },
            ],
          }),
          component("footer", { businessName: name }),
        ],
      },
    };
  }

  if (
    /add\s+(an?\s+)?about\s+page/.test(lower) ||
    /create\s+(an?\s+)?about\s+page/.test(lower)
  ) {
    return {
      kind: "add_page",
      page: {
        title: "About",
        slug: "about",
        intent: "about",
        components: [
          component("nav", { links: navLinks() }),
          component("hero", {
            headline: `About ${name}`,
            subheadline: "Our story and approach",
            ctaLabel: "Work with us",
            ctaHref: "/contact",
          }),
          component("about", {
            headline: "Who we are",
            body: `${name} is built around clear communication, local expertise, and outcomes that matter.`,
          }),
          component("footer", { businessName: name }),
        ],
      },
    };
  }

  if (
    /add\s+(a\s+)?contact\s+page/.test(lower) ||
    /create\s+(a\s+)?contact\s+page/.test(lower)
  ) {
    return {
      kind: "add_page",
      page: {
        title: "Contact",
        slug: "contact",
        intent: "contact",
        components: [
          component("nav", { links: navLinks() }),
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
          component("footer", { businessName: name }),
        ],
      },
    };
  }

  if (
    /add\s+(an?\s+)?faq/.test(lower) ||
    /create\s+(an?\s+)?faq/.test(lower) ||
    /add\s+(a\s+)?faq\s+page/.test(lower)
  ) {
    return {
      kind: "add_page",
      page: {
        title: "FAQ",
        slug: "faq",
        intent: "custom",
        components: [
          component("nav", { links: navLinks("faq") }),
          component("hero", {
            headline: "Frequently asked questions",
            subheadline: "Quick answers before you get in touch",
            ctaLabel: "Contact us",
            ctaHref: "/contact",
          }),
          component("faq", {
            headline: "FAQs",
            items: [
              {
                q: "How do we get started?",
                a: "Send a short message via the contact form and we’ll reply with next steps.",
              },
              {
                q: "Which areas do you cover?",
                a: "We work with clients locally and can advise on the best approach for your situation.",
              },
              {
                q: "What happens after I enquire?",
                a: "We’ll confirm details, outline options, and book a time that suits you.",
              },
            ],
          }),
          component("footer", { businessName: name }),
        ],
      },
    };
  }

  const ctaMatch =
    lower.match(/change\s+(?:the\s+)?(?:primary\s+)?cta\s+to\s+["']?(.+?)["']?\s*$/) ||
    lower.match(/(?:set|update)\s+(?:the\s+)?cta\s+to\s+["']?(.+?)["']?\s*$/) ||
    lower.match(/cta\s+to\s+["']([^"']+)["']/i) ||
    prompt.match(/change\s+(?:the\s+)?(?:primary\s+)?CTA\s+to\s+(.+)$/i);
  if (ctaMatch?.[1]) {
    return {
      kind: "change_cta",
      ctaLabel: ctaMatch[1].trim().replace(/[."]+$/, ""),
    };
  }

  const headlineMatch =
    lower.match(
      /(?:change|set|update)\s+(?:the\s+)?(?:hero\s+)?headline\s+to\s+["']?(.+?)["']?\s*$/,
    ) || prompt.match(/(?:change|set|update)\s+(?:the\s+)?(?:hero\s+)?headline\s+to\s+(.+)$/i);
  if (headlineMatch?.[1]) {
    return {
      kind: "change_headline",
      headline: headlineMatch[1].trim().replace(/[."]+$/, ""),
    };
  }

  const subMatch =
    lower.match(
      /(?:change|set|update)\s+(?:the\s+)?(?:hero\s+)?(?:subheadline|tagline|subtitle)\s+to\s+["']?(.+?)["']?\s*$/,
    ) ||
    prompt.match(
      /(?:change|set|update)\s+(?:the\s+)?(?:hero\s+)?(?:subheadline|tagline|subtitle)\s+to\s+(.+)$/i,
    );
  if (subMatch?.[1]) {
    return {
      kind: "change_subheadline",
      subheadline: subMatch[1].trim().replace(/[."]+$/, ""),
    };
  }

  const colorMatch =
    lower.match(
      /(?:change|set|update)\s+(?:the\s+)?(?:primary\s+)?(?:colo(?:u)?r|brand)\s+to\s+(#[0-9a-f]{3,8}|\w+)/i,
    ) || lower.match(/primary\s+(?:colo(?:u)?r|brand)\s+(#[0-9a-f]{3,8})/i);
  if (colorMatch?.[1]) {
    const raw = colorMatch[1].trim();
    const color = raw.startsWith("#") ? raw : namedColor(raw);
    if (color) return { kind: "set_primary_color", color };
  }

  if (
    /make\s+(it\s+)?(more\s+)?premium/.test(lower) ||
    /more\s+premium/.test(lower) ||
    /elevate\s+(the\s+)?(tone|copy|brand)/.test(lower)
  ) {
    return { kind: "make_premium" };
  }

  if (
    /ai\s+visibility/.test(lower) ||
    /rewrite\s+for\s+ai/.test(lower) ||
    /answer[- ]?engine/.test(lower)
  ) {
    return { kind: "ai_visibility" };
  }

  return { kind: "noop" };
}

function namedColor(name: string): string | null {
  const map: Record<string, string> = {
    navy: "#1e3a5f",
    blue: "#1d4ed8",
    teal: "#0f766e",
    green: "#166534",
    charcoal: "#1f2937",
    black: "#111827",
    gold: "#b45309",
    burgundy: "#7f1d1d",
    forest: "#14532d",
  };
  return map[name.toLowerCase()] ?? null;
}

function applyCtaLabel(
  components: WebsiteComponent[],
  label: string,
): WebsiteComponent[] {
  return components.map((c) => {
    if (c.type === "hero") {
      return { ...c, props: { ...c.props, ctaLabel: label } };
    }
    if (c.type === "cta") {
      return {
        ...c,
        props: { ...c.props, buttonLabel: label },
      };
    }
    return c;
  });
}

function applyHeadline(
  components: WebsiteComponent[],
  headline: string,
): WebsiteComponent[] {
  let done = false;
  return components.map((c) => {
    if (!done && c.type === "hero") {
      done = true;
      return { ...c, props: { ...c.props, headline } };
    }
    return c;
  });
}

function applySubheadline(
  components: WebsiteComponent[],
  subheadline: string,
): WebsiteComponent[] {
  let done = false;
  return components.map((c) => {
    if (!done && c.type === "hero") {
      done = true;
      return { ...c, props: { ...c.props, subheadline } };
    }
    return c;
  });
}

function makePremiumComponents(
  components: WebsiteComponent[],
  businessName: string,
): WebsiteComponent[] {
  return components.map((c) => {
    if (c.type === "hero") {
      return {
        ...c,
        props: {
          ...c.props,
          headline:
            typeof c.props.headline === "string" && c.props.headline.trim()
              ? c.props.headline
              : businessName,
          subheadline:
            typeof c.props.subheadline === "string"
              ? refinePremiumCopy(c.props.subheadline)
              : `Discerning service from ${businessName}`,
          ctaLabel:
            typeof c.props.ctaLabel === "string" && c.props.ctaLabel.trim()
              ? c.props.ctaLabel
              : "Arrange a consultation",
        },
      };
    }
    if (c.type === "trust") {
      return {
        ...c,
        props: {
          ...c.props,
          items: ["Trusted locally", "White-glove service", "Clear, considered advice"],
        },
      };
    }
    if (c.type === "cta") {
      return {
        ...c,
        props: {
          ...c.props,
          headline: "Ready when you are",
          body: "Share a little context and we’ll prepare a thoughtful next step.",
          buttonLabel:
            typeof c.props.buttonLabel === "string" && c.props.buttonLabel.trim()
              ? c.props.buttonLabel
              : "Arrange a consultation",
        },
      };
    }
    if (c.type === "about" && typeof c.props.body === "string") {
      return {
        ...c,
        props: {
          ...c.props,
          body: refinePremiumCopy(c.props.body),
        },
      };
    }
    return c;
  });
}

function refinePremiumCopy(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "A considered approach for clients who value clarity and results.";
  if (/premium|bespoke|considered|discerning/i.test(trimmed)) return trimmed;
  return `${trimmed.replace(/\.$/, "")} — delivered with care and clarity.`;
}

function refineAiVisibilityCopy(text: string, businessName: string): string {
  const trimmed = text.trim();
  const base =
    trimmed ||
    `${businessName} helps local clients with clear advice and practical next steps.`;
  if (/who we help|what we offer|how it works|faq/i.test(base)) return base;
  return `${base.replace(/\.$/, "")}. Who we help: local clients seeking clear guidance. What to do next: send an enquiry and we’ll outline options.`;
}

async function applyHeuristicPatch(
  input: {
    organisationId: string;
    websiteId: string;
    actorId?: string;
  },
  website: SerializedWebsite,
  heuristic: Exclude<HeuristicPatch, { kind: "noop" }>,
): Promise<WebsiteAssistResult> {
  if (heuristic.kind === "add_page" && heuristic.page) {
    const exists = website.pages?.some((p) => p.slug === heuristic.page.slug);
    if (!exists) {
      await createWebsitePage({
        organisationId: input.organisationId,
        websiteId: website.id,
        actorId: input.actorId,
        title: heuristic.page.title,
        slug: heuristic.page.slug,
        intent: heuristic.page.intent,
        components: heuristic.page.components,
      });
    }
    const updated = await getWebsite(input.organisationId, website.id);
    return {
      website: updated!,
      applied: exists
        ? `${heuristic.page.title} page already exists`
        : `Added ${heuristic.page.slug} page`,
      source: "heuristic",
    };
  }

  if (heuristic.kind === "change_cta") {
    for (const page of website.pages ?? []) {
      await updateWebsitePage({
        organisationId: input.organisationId,
        websiteId: website.id,
        pageId: page.id,
        actorId: input.actorId,
        components: applyCtaLabel(page.components, heuristic.ctaLabel),
      });
    }
    const updated = await getWebsite(input.organisationId, website.id);
    return {
      website: updated!,
      applied: `CTA → ${heuristic.ctaLabel}`,
      source: "heuristic",
    };
  }

  if (heuristic.kind === "change_headline") {
    const home =
      website.pages?.find((p) => p.intent === "home" || p.slug === "home") ||
      website.pages?.[0];
    if (home) {
      await updateWebsitePage({
        organisationId: input.organisationId,
        websiteId: website.id,
        pageId: home.id,
        actorId: input.actorId,
        components: applyHeadline(home.components, heuristic.headline),
      });
    }
    const updated = await getWebsite(input.organisationId, website.id);
    return {
      website: updated!,
      applied: `Headline → ${heuristic.headline}`,
      source: "heuristic",
    };
  }

  if (heuristic.kind === "change_subheadline") {
    const home =
      website.pages?.find((p) => p.intent === "home" || p.slug === "home") ||
      website.pages?.[0];
    if (home) {
      await updateWebsitePage({
        organisationId: input.organisationId,
        websiteId: website.id,
        pageId: home.id,
        actorId: input.actorId,
        components: applySubheadline(home.components, heuristic.subheadline),
      });
    }
    const updated = await getWebsite(input.organisationId, website.id);
    return {
      website: updated!,
      applied: `Subheadline → ${heuristic.subheadline}`,
      source: "heuristic",
    };
  }

  if (heuristic.kind === "set_primary_color") {
    await updateWebsite({
      organisationId: input.organisationId,
      websiteId: website.id,
      actorId: input.actorId,
      theme: { ...(website.theme ?? {}), primaryColor: heuristic.color },
    });
    const updated = await getWebsite(input.organisationId, website.id);
    return {
      website: updated!,
      applied: `Primary colour → ${heuristic.color}`,
      source: "heuristic",
    };
  }

  if (heuristic.kind === "make_premium") {
    const biz = website.theme?.businessName || website.name;
    for (const page of website.pages ?? []) {
      await updateWebsitePage({
        organisationId: input.organisationId,
        websiteId: website.id,
        pageId: page.id,
        actorId: input.actorId,
        components: makePremiumComponents(page.components, biz),
      });
    }
    const updated = await getWebsite(input.organisationId, website.id);
    return {
      website: updated!,
      applied: "Elevated tone (premium)",
      source: "heuristic",
    };
  }

  if (heuristic.kind === "ai_visibility") {
    const biz = website.theme?.businessName || website.name;
    const siteDesc = refineAiVisibilityCopy(
      website.seo?.description || website.brief || "",
      biz,
    );
    await updateWebsite({
      organisationId: input.organisationId,
      websiteId: website.id,
      actorId: input.actorId,
      seo: {
        ...(website.seo ?? {}),
        title: website.seo?.title || `${biz} | Clear answers`,
        description: siteDesc.slice(0, 160),
        keywords: [
          ...new Set([
            ...(website.seo?.keywords ?? []),
            biz,
            "local",
            "enquiry",
          ]),
        ].slice(0, 8),
      },
      metadata: {
        ...(website.metadata ?? {}),
        aiVisibility: {
          tunedAt: new Date().toISOString(),
          note: "Answer-engine friendly SEO + FAQ-ready copy",
        },
      },
    });
    for (const page of website.pages ?? []) {
      const nextComponents = page.components.map((c) => {
        if (c.type === "about" && typeof c.props.body === "string") {
          return {
            ...c,
            props: {
              ...c.props,
              body: refineAiVisibilityCopy(c.props.body, biz),
            },
          };
        }
        if (c.type === "faq") return c;
        return c;
      });
      const hasFaq = nextComponents.some((c) => c.type === "faq");
      const withFaq = hasFaq
        ? nextComponents
        : [
            ...nextComponents.filter((c) => c.type !== "footer"),
            component("faq", {
              headline: "Quick answers",
              items: [
                {
                  q: `What does ${biz} help with?`,
                  a: `${biz} helps clients with clear advice and practical next steps.`,
                },
                {
                  q: "How do I get started?",
                  a: "Send a short enquiry via the contact form and we’ll reply with options.",
                },
                {
                  q: "Which areas do you cover?",
                  a: "We work with local clients and can advise on the best approach for your situation.",
                },
              ],
            }),
            ...nextComponents.filter((c) => c.type === "footer"),
          ];
      await updateWebsitePage({
        organisationId: input.organisationId,
        websiteId: website.id,
        pageId: page.id,
        actorId: input.actorId,
        components: withFaq,
        seo: {
          ...(page.seo ?? {}),
          title: page.seo?.title || `${page.title} | ${biz}`,
          description: refineAiVisibilityCopy(
            page.seo?.description || siteDesc,
            biz,
          ).slice(0, 160),
        },
      });
    }
    const updated = await getWebsite(input.organisationId, website.id);
    return {
      website: updated!,
      applied: "Tuned for AI visibility (SEO + FAQ)",
      source: "heuristic",
    };
  }

  return {
    website,
    applied: "no change",
    source: "heuristic",
  };
}

/**
 * Apply an NL Studio prompt to a website model.
 */
export async function applyWebsiteAssistPrompt(input: {
  organisationId: string;
  websiteId: string;
  actorId?: string;
  prompt: string;
}): Promise<WebsiteAssistResult | null> {
  const website = await getWebsite(input.organisationId, input.websiteId);
  if (!website) return null;

  const prompt = input.prompt.trim();
  if (!prompt) {
    return { website, applied: "empty prompt", source: "heuristic" };
  }

  // Reliable path first: known prompts use heuristics (skip LLM round-trip)
  const earlyHeuristic = heuristicPatch(website, prompt);
  if (earlyHeuristic.kind !== "noop") {
    return applyHeuristicPatch(input, website, earlyHeuristic);
  }

  // Prefer structured LLM patch when available for open-ended prompts
  if (llmConfigured()) {
    try {
      const result = await llmChat({
        maxTokens: 3000,
        messages: [
          {
            role: "system",
            content: [
              "You edit DigitalGate website models. Return ONLY JSON.",
              "Either:",
              '1) { "action": "add_page", "page": { title, slug, intent, components: [{type, props}] } }',
              '2) { "action": "update_pages", "pages": [{ "slug": "...", "components": [...] }] }',
              '3) { "action": "set_cta", "label": "..." }',
              '4) { "action": "set_headline", "headline": "..." }',
              '5) { "action": "set_subheadline", "subheadline": "..." }',
              '6) { "action": "set_theme", "theme": { "primaryColor"?: "#hex", "accentColor"?: "#hex" } }',
              '7) { "action": "make_premium" }',
              "Component types: nav, hero, trust, services, about, testimonials, cta, faq, contact_form, footer.",
              "Never return HTML. Preserve brand voice. Australian English.",
              "Prefer minimal patches — only change what the user asked for.",
            ].join("\n"),
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              website: {
                name: website.name,
                theme: website.theme,
                pages: website.pages?.map((p) => ({
                  title: p.title,
                  slug: p.slug,
                  intent: p.intent,
                  components: p.components,
                })),
              },
            }),
          },
        ],
      });

      const text = result.text.trim();
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonText = fenced?.[1]?.trim() ?? text;
      const patch = JSON.parse(jsonText) as {
        action?: string;
        label?: string;
        headline?: string;
        subheadline?: string;
        theme?: { primaryColor?: string; accentColor?: string };
        page?: {
          title: string;
          slug: string;
          intent?: string;
          components?: unknown[];
        };
        pages?: Array<{ slug: string; components?: unknown[] }>;
      };

      if (patch.action === "set_cta" && patch.label) {
        for (const page of website.pages ?? []) {
          await updateWebsitePage({
            organisationId: input.organisationId,
            websiteId: website.id,
            pageId: page.id,
            actorId: input.actorId,
            components: applyCtaLabel(page.components, patch.label),
          });
        }
        const updated = await getWebsite(input.organisationId, website.id);
        return {
          website: updated!,
          applied: `CTA → ${patch.label}`,
          source: "llm",
        };
      }

      if (patch.action === "set_headline" && patch.headline) {
        const home =
          website.pages?.find((p) => p.intent === "home" || p.slug === "home") ||
          website.pages?.[0];
        if (home) {
          await updateWebsitePage({
            organisationId: input.organisationId,
            websiteId: website.id,
            pageId: home.id,
            actorId: input.actorId,
            components: applyHeadline(home.components, patch.headline),
          });
        }
        const updated = await getWebsite(input.organisationId, website.id);
        return {
          website: updated!,
          applied: `Headline → ${patch.headline}`,
          source: "llm",
        };
      }

      if (patch.action === "set_subheadline" && patch.subheadline) {
        const home =
          website.pages?.find((p) => p.intent === "home" || p.slug === "home") ||
          website.pages?.[0];
        if (home) {
          await updateWebsitePage({
            organisationId: input.organisationId,
            websiteId: website.id,
            pageId: home.id,
            actorId: input.actorId,
            components: applySubheadline(home.components, patch.subheadline),
          });
        }
        const updated = await getWebsite(input.organisationId, website.id);
        return {
          website: updated!,
          applied: `Subheadline → ${patch.subheadline}`,
          source: "llm",
        };
      }

      if (patch.action === "set_theme" && patch.theme) {
        await updateWebsite({
          organisationId: input.organisationId,
          websiteId: website.id,
          actorId: input.actorId,
          theme: { ...(website.theme ?? {}), ...patch.theme },
        });
        const updated = await getWebsite(input.organisationId, website.id);
        return {
          website: updated!,
          applied: "Updated theme colours",
          source: "llm",
        };
      }

      if (patch.action === "make_premium") {
        const biz = website.theme?.businessName || website.name;
        for (const page of website.pages ?? []) {
          await updateWebsitePage({
            organisationId: input.organisationId,
            websiteId: website.id,
            pageId: page.id,
            actorId: input.actorId,
            components: makePremiumComponents(page.components, biz),
          });
        }
        const updated = await getWebsite(input.organisationId, website.id);
        return {
          website: updated!,
          applied: "Elevated tone (premium)",
          source: "llm",
        };
      }

      if (patch.action === "add_page" && patch.page?.title && patch.page?.slug) {
        const existing = website.pages?.find((p) => p.slug === patch.page!.slug);
        if (!existing) {
          await createWebsitePage({
            organisationId: input.organisationId,
            websiteId: website.id,
            actorId: input.actorId,
            title: patch.page.title,
            slug: patch.page.slug,
            intent: patch.page.intent,
            components: normalizeComponents(patch.page.components),
          });
        }
        const updated = await getWebsite(input.organisationId, website.id);
        return {
          website: updated!,
          applied: existing
            ? `Page ${patch.page.slug} already exists`
            : `Added page ${patch.page.slug}`,
          source: "llm",
        };
      }

      if (patch.action === "update_pages" && Array.isArray(patch.pages)) {
        for (const p of patch.pages) {
          const match = website.pages?.find((x) => x.slug === p.slug);
          if (!match || !p.components) continue;
          await updateWebsitePage({
            organisationId: input.organisationId,
            websiteId: website.id,
            pageId: match.id,
            actorId: input.actorId,
            components: normalizeComponents(p.components),
          });
        }
        const updated = await getWebsite(input.organisationId, website.id);
        return {
          website: updated!,
          applied: "Updated page components",
          source: "llm",
        };
      }

      // Fall through to heuristic if action unknown
    } catch (err) {
      return {
        website,
        applied:
          "no matching edit — try “add services page”, “change CTA to …”, “make it more premium”, “rewrite for AI visibility”, or “set primary colour to navy”",
        source: "heuristic",
        error: err instanceof Error ? err.message : "LLM patch failed",
      };
    }
  }

  return {
    website,
    applied:
      "no matching edit — try “add services page”, “change CTA to …”, “make it more premium”, “rewrite for AI visibility”, or “set primary colour to navy”",
    source: "heuristic",
  };
}

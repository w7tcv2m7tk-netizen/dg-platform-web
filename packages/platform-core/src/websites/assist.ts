/**
 * Natural-language Studio edits → structured model patches (not HTML dumps).
 */

import { llmChat, llmConfigured } from "../ai/llm";
import { createWebsitePage, getWebsite, updateWebsitePage } from "./crud";
import { component, normalizeComponents } from "./schema";
import type { SerializedWebsite, WebsiteComponent } from "./types";

export type WebsiteAssistResult = {
  website: SerializedWebsite;
  applied: string;
  source: "llm" | "heuristic";
  error?: string;
};

function heuristicPatch(
  website: SerializedWebsite,
  prompt: string,
): {
  kind: "add_services" | "change_cta" | "noop";
  ctaLabel?: string;
  page?: { title: string; slug: string; components: WebsiteComponent[] };
} {
  const lower = prompt.toLowerCase();

  if (
    /add\s+(a\s+)?services?\s+page/.test(lower) ||
    /create\s+(a\s+)?services?\s+page/.test(lower)
  ) {
    const name = website.theme?.businessName || website.name;
    return {
      kind: "add_services",
      page: {
        title: "Services",
        slug: "services",
        components: [
          component("nav", {
            links: [
              { label: "Home", href: "/" },
              { label: "Services", href: "/services" },
              { label: "Contact", href: "/contact" },
            ],
          }),
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

  const ctaMatch =
    lower.match(/change\s+(?:the\s+)?(?:primary\s+)?cta\s+to\s+["']?(.+?)["']?\s*$/) ||
    lower.match(/cta\s+to\s+["']([^"']+)["']/i) ||
    prompt.match(/change\s+(?:the\s+)?(?:primary\s+)?CTA\s+to\s+(.+)$/i);
  if (ctaMatch?.[1]) {
    return { kind: "change_cta", ctaLabel: ctaMatch[1].trim().replace(/[."]+$/, "") };
  }

  return { kind: "noop" };
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

  // Prefer structured LLM patch when available
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
              "Component types: nav, hero, trust, services, about, testimonials, cta, faq, contact_form, footer.",
              "Never return HTML. Preserve brand voice. Australian English.",
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
          applied: `Added page ${patch.page.slug}`,
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
      // heuristic below
      const heuristic = heuristicPatch(website, prompt);
      if (heuristic.kind === "noop") {
        return {
          website,
          applied: "no change",
          source: "heuristic",
          error: err instanceof Error ? err.message : "LLM patch failed",
        };
      }
    }
  }

  const heuristic = heuristicPatch(website, prompt);

  if (heuristic.kind === "add_services" && heuristic.page) {
    const exists = website.pages?.some((p) => p.slug === "services");
    if (!exists) {
      await createWebsitePage({
        organisationId: input.organisationId,
        websiteId: website.id,
        actorId: input.actorId,
        title: heuristic.page.title,
        slug: heuristic.page.slug,
        intent: "services",
        components: heuristic.page.components,
      });
    }
    const updated = await getWebsite(input.organisationId, website.id);
    return {
      website: updated!,
      applied: exists ? "Services page already exists" : "Added services page",
      source: "heuristic",
    };
  }

  if (heuristic.kind === "change_cta" && heuristic.ctaLabel) {
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

  return {
    website,
    applied: "no matching edit — try “add services page” or “change CTA to …”",
    source: "heuristic",
  };
}

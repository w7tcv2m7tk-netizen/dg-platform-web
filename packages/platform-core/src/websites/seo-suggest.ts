/**
 * AI SEO suggestions for Website Studio. Uses the shared model router
 * (AI Gateway → OpenAI/Anthropic). Returns improved metadata for a page or the
 * whole site; the Studio populates the fields for the operator to review + save.
 * Never writes to the database.
 */
import { getWebsite } from "./crud";
import type { WebsiteComponent, WebsiteSeo } from "./types";
import { llmChat, llmConfigured } from "../ai/llm";

export type SeoSuggestion = Pick<
  WebsiteSeo,
  "title" | "description" | "ogTitle" | "ogDescription" | "keywords"
>;

export type SeoSuggestResult =
  | { ok: true; seo: SeoSuggestion; provider: string }
  | { ok: false; error: string };

function stripHtml(html: string): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractComponentText(components: WebsiteComponent[]): string {
  const parts: string[] = [];
  for (const c of components) {
    const p = c.props ?? {};
    if (c.type === "html" && typeof p.html === "string") {
      parts.push(stripHtml(p.html));
    }
    for (const key of [
      "headline",
      "subheadline",
      "text",
      "body",
      "eyebrow",
      "ctaLabel",
    ]) {
      const v = p[key];
      if (typeof v === "string" && v.trim()) parts.push(v.trim());
    }
    if (Array.isArray(p.items)) {
      parts.push(p.items.filter((x) => typeof x === "string").join(", "));
    }
  }
  return parts.join("\n").replace(/[ \t]+\n/g, "\n").trim();
}

/** Pull an SEO JSON object out of an LLM response (handles code fences / prose). */
export function parseSeoSuggestion(text: string): SeoSuggestion | null {
  if (!text) return null;
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const str = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;
  const keywords = Array.isArray(obj.keywords)
    ? (obj.keywords
        .map((k) => (typeof k === "string" ? k.trim() : ""))
        .filter(Boolean) as string[])
    : typeof obj.keywords === "string"
      ? obj.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : undefined;
  const seo: SeoSuggestion = {
    title: str(obj.title),
    description: str(obj.description),
    ogTitle: str(obj.ogTitle ?? obj.og_title),
    ogDescription: str(obj.ogDescription ?? obj.og_description),
    keywords: keywords && keywords.length ? keywords : undefined,
  };
  if (
    !seo.title &&
    !seo.description &&
    !seo.ogTitle &&
    !seo.ogDescription &&
    !seo.keywords
  ) {
    return null;
  }
  return seo;
}

export async function suggestWebsiteSeo(input: {
  organisationId: string;
  websiteId: string;
  scope: "site" | "page";
  pageId?: string;
}): Promise<SeoSuggestResult> {
  if (!llmConfigured()) {
    return { ok: false, error: "AI is not configured for this environment." };
  }
  const site = await getWebsite(input.organisationId, input.websiteId);
  if (!site) return { ok: false, error: "Website not found" };

  const pages = site.pages ?? [];
  const page =
    input.scope === "page"
      ? (pages.find((p) => p.id === input.pageId) ?? pages[0])
      : (pages.find((p) => p.intent === "home" || p.slug === "home") ?? pages[0]);

  const existing = (input.scope === "page" ? page?.seo : site.seo) ?? {};
  const content = extractComponentText(page?.components ?? []).slice(0, 4000);
  const scopeLabel = input.scope === "site" ? "whole website" : "page";

  const system =
    "You are a senior SEO copywriter for small-business websites. Improve the " +
    "metadata for the given page. Respond with ONLY a JSON object — no prose, no " +
    'code fence — with keys: "title" (<= 60 chars, compelling), "description" ' +
    '(<= 155 chars, benefit-led, natural), "ogTitle" (<= 60 chars), ' +
    '"ogDescription" (<= 155 chars), "keywords" (array of 5-8 concise, relevant ' +
    "phrases). Australian English. Do not invent facts unsupported by the content.";

  const user = [
    `Site: ${site.name}`,
    `Scope: ${scopeLabel}`,
    page ? `Page title: ${page.title}` : "",
    `Existing metadata: ${JSON.stringify(existing)}`,
    content ? `Page content:\n${content}` : "Page content: (none provided)",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await llmChat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      maxTokens: 500,
      tier: "standard",
    });
    const seo = parseSeoSuggestion(result.text);
    if (!seo) {
      return { ok: false, error: "AI returned an unexpected format. Try again." };
    }
    return { ok: true, seo, provider: `${result.provider}/${result.model}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI request failed",
    };
  }
}

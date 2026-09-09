/**
 * AI markup suggestions for Website Studio (page HTML, header, footer, site CSS).
 * Uses the shared model router (llmChat). Returns improved content for the
 * operator to review and save. Read-only; never writes the database.
 */
import { llmChat, llmConfigured } from "../ai/llm";

export type MarkupKind = "page-html" | "header" | "footer" | "css";

export type MarkupSuggestResult =
  | { ok: true; content: string; provider: string }
  | { ok: false; error: string };

const KIND_GUIDE: Record<
  MarkupKind,
  { label: string; system: string; maxTokens: number; maxInput: number }
> = {
  "page-html": {
    label: "page body HTML",
    system:
      "You are an expert web developer and conversion copywriter editing the " +
      "BODY HTML of a marketing web page. The input is a self-contained HTML " +
      "fragment/island (it may include a <style> block) — keep it a fragment, " +
      "not a full HTML document. Preserve the page's intent and ALL real " +
      "information (facts, prices, links, contact details); improve structure, " +
      "semantics, accessibility and copy. Australian English. Return ONLY the " +
      "HTML — no markdown fences, no explanation.",
    maxTokens: 4000,
    maxInput: 24000,
  },
  header: {
    label: "site header HTML",
    system:
      "You are an expert web developer editing a site HEADER HTML fragment (it " +
      "may include a <style> block); it renders above every page. Keep the " +
      "logo, navigation and any links present and functional; improve markup, " +
      "accessibility and styling. Return ONLY the HTML — no markdown fences, no " +
      "explanation.",
    maxTokens: 2500,
    maxInput: 16000,
  },
  footer: {
    label: "site footer HTML",
    system:
      "You are an expert web developer editing a site FOOTER HTML fragment (it " +
      "may include a <style> block); it renders below every page. Keep the " +
      "columns, links and legal/copyright present; improve markup, " +
      "accessibility and styling. Return ONLY the HTML — no markdown fences, no " +
      "explanation.",
    maxTokens: 2500,
    maxInput: 16000,
  },
  css: {
    label: "site-wide CSS",
    system:
      "You are an expert CSS author editing site-wide CSS applied to every " +
      "page. Improve and tidy it without breaking existing selectors. Return " +
      "ONLY valid CSS — no markdown fences, no explanation, and no <style> tag.",
    maxTokens: 2000,
    maxInput: 16000,
  },
};

function stripCodeFence(text: string, kind: MarkupKind): string {
  let out = text.trim();
  const fence = out.match(/```(?:html|css|xml)?\s*([\s\S]*?)```\s*$/i);
  if (fence) out = fence[1].trim();
  else out = out.replace(/^```(?:html|css|xml)?\s*/i, "").replace(/```\s*$/i, "").trim();
  if (kind === "css") {
    out = out
      .replace(/^<style[^>]*>/i, "")
      .replace(/<\/style>\s*$/i, "")
      .trim();
  }
  return out;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  if (!text) return null;
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export type ComponentSuggestResult =
  | { ok: true; props: Record<string, unknown>; provider: string }
  | { ok: false; error: string };

/**
 * Improve the human-facing copy of a website component. Only string (and
 * string-array) values are replaced; keys, structure, URLs and non-text values
 * are preserved, so the component can never be structurally corrupted.
 */
export async function suggestComponentProps(input: {
  type: string;
  props: Record<string, unknown>;
  siteName?: string;
}): Promise<ComponentSuggestResult> {
  if (!llmConfigured()) {
    return { ok: false, error: "AI is not configured for this environment." };
  }
  const system =
    "You improve the marketing copy of a single website component. You are given " +
    "the component type and its JSON props. Rewrite ONLY the human-facing text " +
    "values to be clearer and more compelling; keep EVERY key, keep non-text " +
    "values (URLs, booleans, numbers, layout) unchanged, and do not add or remove " +
    "keys. Australian English. Return ONLY the JSON object — no markdown, no prose.";
  const user = [
    `Component type: ${input.type}`,
    input.siteName ? `Site: ${input.siteName}` : "",
    "Props JSON:",
    JSON.stringify(input.props).slice(0, 8000),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await llmChat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      maxTokens: 1500,
      tier: "standard",
    });
    const parsed = extractJsonObject(result.text);
    if (!parsed) {
      return { ok: false, error: "AI returned an unexpected format. Try again." };
    }
    // Safe merge: only replace string / string-array values that existed.
    const merged: Record<string, unknown> = { ...input.props };
    for (const key of Object.keys(input.props)) {
      const original = input.props[key];
      const next = parsed[key];
      if (typeof original === "string" && typeof next === "string" && next.trim()) {
        merged[key] = next;
      } else if (
        Array.isArray(original) &&
        original.every((x) => typeof x === "string") &&
        Array.isArray(next) &&
        next.every((x) => typeof x === "string")
      ) {
        merged[key] = next;
      }
    }
    return { ok: true, props: merged, provider: `${result.provider}/${result.model}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI request failed",
    };
  }
}

export async function suggestWebsiteMarkup(input: {
  kind: MarkupKind;
  current: string;
  instruction?: string;
  siteName?: string;
}): Promise<MarkupSuggestResult> {
  if (!llmConfigured()) {
    return { ok: false, error: "AI is not configured for this environment." };
  }
  const guide = KIND_GUIDE[input.kind];
  const current = (input.current ?? "").slice(0, guide.maxInput);
  const instruction = input.instruction?.trim();

  const user = [
    input.siteName ? `Site: ${input.siteName}` : "",
    instruction
      ? `Instruction: ${instruction}`
      : `Instruction: Improve the ${guide.label} — cleaner, more modern and more effective — without losing any real content.`,
    "",
    `Current ${guide.label}:`,
    current || "(empty — create a sensible, on-brand default)",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await llmChat({
      messages: [
        { role: "system", content: guide.system },
        { role: "user", content: user },
      ],
      maxTokens: guide.maxTokens,
      tier: "standard",
    });
    const content = stripCodeFence(result.text, input.kind);
    if (!content) return { ok: false, error: "AI returned empty content. Try again." };
    return { ok: true, content, provider: `${result.provider}/${result.model}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI request failed",
    };
  }
}

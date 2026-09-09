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

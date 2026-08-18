/**
 * Platform Intelligence Phase 1 — Super Admin RAG over curated docs.
 *
 * Retrieval: in-process chunk + keyword similarity over allowlisted markdown.
 * No vector DB — see docs/ai/PLATFORM-INTELLIGENCE.md (Phase 1 tradeoff).
 * Answers: Model Router (llmChat) with forced confidence + citations.
 * Empty retrieval → 🔴 Unknown (never invent).
 */

import { llmChat, llmConfigured } from "./llm";

export type PlatformIntelligenceConfidence = "confirmed" | "likely" | "unknown";

export type PlatformDocCorpusEntry = {
  slug: string;
  title: string;
  relativePath: string;
  content: string;
};

export type RetrievedDocChunk = {
  id: string;
  slug: string;
  title: string;
  relativePath: string;
  heading: string | null;
  text: string;
  score: number;
};

export type PlatformIntelligenceCitation = {
  relativePath: string;
  slug: string;
  title: string;
  heading: string | null;
  href: string;
};

export type PlatformIntelligenceAnswer = {
  question: string;
  answer: string;
  confidence: PlatformIntelligenceConfidence;
  /** Display label e.g. "🟢 Confirmed" */
  confidenceLabel: string;
  citations: PlatformIntelligenceCitation[];
  retrieved: Array<{
    relativePath: string;
    slug: string;
    title: string;
    heading: string | null;
    score: number;
    href: string;
    excerpt: string;
  }>;
  source: "llm" | "empty_retrieval" | "no_llm" | "llm_error";
  provider?: string;
  model?: string;
  latencyMs?: number;
  generatedAt: string;
};

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "with",
  "by",
  "from",
  "as",
  "it",
  "this",
  "that",
  "these",
  "those",
  "how",
  "what",
  "when",
  "where",
  "why",
  "who",
  "which",
  "do",
  "does",
  "did",
  "can",
  "could",
  "should",
  "would",
  "will",
  "may",
  "might",
  "about",
  "into",
  "over",
  "under",
  "not",
  "no",
  "yes",
  "we",
  "you",
  "they",
  "our",
  "your",
  "their",
]);

const CONFIDENCE_LABELS: Record<PlatformIntelligenceConfidence, string> = {
  confirmed: "🟢 Confirmed",
  likely: "🟡 Likely",
  unknown: "🔴 Unknown",
};

const DEFAULT_TOP_K = 5;
const MIN_SCORE = 1.5;
const MAX_CHUNK_CHARS = 1200;

export function confidenceLabel(
  confidence: PlatformIntelligenceConfidence,
): string {
  return CONFIDENCE_LABELS[confidence];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+/.\-_\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function citationHref(slug: string): string {
  return `/command/docs/${slug}`;
}

/**
 * Split markdown into heading-aware chunks (fallback: fixed windows).
 */
export function chunkPlatformDoc(entry: PlatformDocCorpusEntry): RetrievedDocChunk[] {
  const lines = entry.content.replace(/\r\n/g, "\n").split("\n");
  const sections: Array<{ heading: string | null; body: string[] }> = [];
  let current: { heading: string | null; body: string[] } = {
    heading: null,
    body: [],
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      if (current.body.some((l) => l.trim()) || current.heading) {
        sections.push(current);
      }
      current = { heading: headingMatch[2].trim(), body: [] };
      continue;
    }
    current.body.push(line);
  }
  if (current.body.some((l) => l.trim()) || current.heading) {
    sections.push(current);
  }

  const chunks: RetrievedDocChunk[] = [];
  let idx = 0;

  for (const section of sections) {
    const body = section.body.join("\n").trim();
    if (!body && !section.heading) continue;

    const pieces =
      body.length <= MAX_CHUNK_CHARS
        ? [body]
        : splitWindow(body, MAX_CHUNK_CHARS, 150);

    for (const piece of pieces) {
      const text = [section.heading ? `## ${section.heading}` : "", piece]
        .filter(Boolean)
        .join("\n\n")
        .trim();
      if (!text) continue;
      chunks.push({
        id: `${entry.slug}:${idx++}`,
        slug: entry.slug,
        title: entry.title,
        relativePath: entry.relativePath,
        heading: section.heading,
        text,
        score: 0,
      });
    }
  }

  if (chunks.length === 0 && entry.content.trim()) {
    chunks.push({
      id: `${entry.slug}:0`,
      slug: entry.slug,
      title: entry.title,
      relativePath: entry.relativePath,
      heading: null,
      text: entry.content.slice(0, MAX_CHUNK_CHARS),
      score: 0,
    });
  }

  return chunks;
}

function splitWindow(text: string, size: number, overlap: number): string[] {
  const out: string[] = [];
  let start = 0;
  while (start < text.length) {
    out.push(text.slice(start, start + size));
    if (start + size >= text.length) break;
    start += Math.max(size - overlap, 1);
  }
  return out;
}

function scoreChunk(queryTokens: string[], chunk: RetrievedDocChunk): number {
  if (queryTokens.length === 0) return 0;

  const hay = [
    chunk.title,
    chunk.heading ?? "",
    chunk.relativePath,
    chunk.text,
  ]
    .join("\n")
    .toLowerCase();
  const hayTokens = tokenize(hay);
  const freq = new Map<string, number>();
  for (const t of hayTokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }

  let score = 0;
  for (const qt of queryTokens) {
    const f = freq.get(qt) ?? 0;
    if (f > 0) {
      score += 1 + Math.min(f, 4) * 0.25;
    }
    // Path / title boost for exact token presence
    if (chunk.title.toLowerCase().includes(qt)) score += 1.2;
    if (chunk.relativePath.toLowerCase().includes(qt)) score += 0.8;
    if ((chunk.heading ?? "").toLowerCase().includes(qt)) score += 0.6;
  }

  // Multi-token phrase bonus (adjacent query words in chunk)
  if (queryTokens.length >= 2) {
    const phrase = queryTokens.slice(0, 4).join(" ");
    if (hay.includes(phrase)) score += 2;
  }

  return score;
}

/**
 * Keyword / token similarity over allowlisted doc chunks.
 * Returns top-K above MIN_SCORE, sorted by score desc.
 */
export function retrievePlatformDocChunks(input: {
  question: string;
  docs: PlatformDocCorpusEntry[];
  topK?: number;
  minScore?: number;
}): RetrievedDocChunk[] {
  const queryTokens = tokenize(input.question);
  if (queryTokens.length === 0 || input.docs.length === 0) return [];

  const topK = input.topK ?? DEFAULT_TOP_K;
  const minScore = input.minScore ?? MIN_SCORE;

  const scored: RetrievedDocChunk[] = [];
  for (const doc of input.docs) {
    for (const chunk of chunkPlatformDoc(doc)) {
      const score = scoreChunk(queryTokens, chunk);
      if (score >= minScore) {
        scored.push({ ...chunk, score });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score || a.relativePath.localeCompare(b.relativePath));
  return scored.slice(0, topK);
}

function unknownAnswer(input: {
  question: string;
  answer: string;
  source: PlatformIntelligenceAnswer["source"];
  retrieved?: RetrievedDocChunk[];
  provider?: string;
  model?: string;
  latencyMs?: number;
}): PlatformIntelligenceAnswer {
  const retrieved = input.retrieved ?? [];
  return {
    question: input.question,
    answer: input.answer,
    confidence: "unknown",
    confidenceLabel: CONFIDENCE_LABELS.unknown,
    citations: [],
    retrieved: retrieved.map((c) => ({
      relativePath: c.relativePath,
      slug: c.slug,
      title: c.title,
      heading: c.heading,
      score: c.score,
      href: citationHref(c.slug),
      excerpt: c.text.slice(0, 280),
    })),
    source: input.source,
    provider: input.provider,
    model: input.model,
    latencyMs: input.latencyMs,
    generatedAt: new Date().toISOString(),
  };
}

function parseConfidence(raw: string): PlatformIntelligenceConfidence | null {
  const normalised = raw.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (normalised.includes("confirmed")) return "confirmed";
  if (normalised.includes("likely")) return "likely";
  if (normalised.includes("unknown")) return "unknown";
  return null;
}

function parseLlmResponse(
  text: string,
  retrieved: RetrievedDocChunk[],
): {
  confidence: PlatformIntelligenceConfidence;
  answer: string;
  citationPaths: string[];
} {
  const confidenceMatch = /CONFIDENCE:\s*(.+)/i.exec(text);
  const answerMatch = /ANSWER:\s*([\s\S]*?)(?=\nCITATIONS:|$)/i.exec(text);
  const citationsBlock = /CITATIONS:\s*([\s\S]*)$/i.exec(text)?.[1] ?? "";

  let confidence =
    parseConfidence(confidenceMatch?.[1] ?? "") ?? ("likely" as const);

  const answer =
    answerMatch?.[1]?.trim() ||
    text
      .replace(/CONFIDENCE:[\s\S]*?/i, "")
      .replace(/CITATIONS:[\s\S]*$/i, "")
      .trim();

  const allow = new Set(retrieved.map((c) => c.relativePath));
  const citationPaths: string[] = [];
  for (const line of citationsBlock.split("\n")) {
    const cleaned = line.replace(/^[-*•]\s*/, "").trim();
    if (!cleaned) continue;
    // Accept "docs/foo.md" or "foo.md" or path with heading
    const pathMatch =
      /(?:docs\/)?([a-zA-Z0-9][a-zA-Z0-9_./-]*\.md)/.exec(cleaned);
    if (!pathMatch) continue;
    const rel = pathMatch[1];
    if (allow.has(rel) && !citationPaths.includes(rel)) {
      citationPaths.push(rel);
    }
  }

  // If model claimed Confirmed but cited nothing valid, downgrade
  if (confidence === "confirmed" && citationPaths.length === 0) {
    confidence = retrieved.length > 0 ? "likely" : "unknown";
  }

  return { confidence, answer: answer || "No answer produced.", citationPaths };
}

function buildCitations(
  paths: string[],
  retrieved: RetrievedDocChunk[],
): PlatformIntelligenceCitation[] {
  const byPath = new Map<string, RetrievedDocChunk>();
  for (const c of retrieved) {
    if (!byPath.has(c.relativePath)) byPath.set(c.relativePath, c);
  }

  const out: PlatformIntelligenceCitation[] = [];
  for (const p of paths) {
    const hit = byPath.get(p);
    if (!hit) continue;
    out.push({
      relativePath: hit.relativePath,
      slug: hit.slug,
      title: hit.title,
      heading: hit.heading,
      href: citationHref(hit.slug),
    });
  }

  // Ensure at least one citation from retrieval when confidence isn't unknown
  if (out.length === 0 && retrieved.length > 0) {
    const first = retrieved[0];
    out.push({
      relativePath: first.relativePath,
      slug: first.slug,
      title: first.title,
      heading: first.heading,
      href: citationHref(first.slug),
    });
  }

  return out;
}

/**
 * Ask Platform Intelligence over a pre-loaded allowlisted corpus.
 */
export async function askPlatformIntelligence(input: {
  question: string;
  docs: PlatformDocCorpusEntry[];
  topK?: number;
}): Promise<PlatformIntelligenceAnswer> {
  const question = input.question.trim();
  if (!question) {
    return unknownAnswer({
      question: "",
      answer: "Ask a question about the DigitalGate platform.",
      source: "empty_retrieval",
    });
  }

  const retrieved = retrievePlatformDocChunks({
    question,
    docs: input.docs,
    topK: input.topK,
  });

  if (retrieved.length === 0) {
    return unknownAnswer({
      question,
      answer:
        "I don’t have evidence for that in the curated staff docs library. Try rephrasing, or open Platform docs to browse the allowlist. I will not invent an answer.",
      source: "empty_retrieval",
    });
  }

  if (!llmConfigured()) {
    return unknownAnswer({
      question,
      answer:
        "Relevant docs were retrieved, but Model Router is not configured (set OPENAI_API_KEY or ANTHROPIC_API_KEY). Open the cited sources below — I will not synthesise without a model.",
      source: "no_llm",
      retrieved,
    });
  }

  const contextBlock = retrieved
    .map(
      (c, i) =>
        `[${i + 1}] docs/${c.relativePath}${c.heading ? ` — ${c.heading}` : ""}\n${c.text}`,
    )
    .join("\n\n---\n\n");

  const system = [
    "You are DigitalGate Platform Intelligence (staff Super Admin AI).",
    "Answer ONLY from the retrieved documentation chunks.",
    "Never invent platform behaviour, APIs, or ownership not present in the chunks.",
    "If evidence is thin, use Likely and say what is missing. If not covered, use Unknown.",
    "Australian English. Concise and precise.",
    "Do not discuss REA, Reputation product ownership, Commerce, or Services boundaries beyond what the chunks state.",
    "",
    "Respond in exactly this format:",
    "CONFIDENCE: Confirmed | Likely | Unknown",
    "ANSWER: <plain text answer>",
    "CITATIONS:",
    "- docs/<relativePath> (<optional heading>)",
  ].join("\n");

  const user = [
    `Question: ${question}`,
    "",
    "Retrieved chunks (allowlisted staff docs only):",
    contextBlock,
  ].join("\n");

  try {
    const result = await llmChat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      maxTokens: 1200,
    });

    const parsed = parseLlmResponse(result.text, retrieved);
    if (parsed.confidence === "unknown") {
      return {
        ...unknownAnswer({
          question,
          answer: parsed.answer,
          source: "llm",
          retrieved,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
        }),
      };
    }

    const citations = buildCitations(parsed.citationPaths, retrieved);

    return {
      question,
      answer: parsed.answer,
      confidence: parsed.confidence,
      confidenceLabel: CONFIDENCE_LABELS[parsed.confidence],
      citations,
      retrieved: retrieved.map((c) => ({
        relativePath: c.relativePath,
        slug: c.slug,
        title: c.title,
        heading: c.heading,
        score: c.score,
        href: citationHref(c.slug),
        excerpt: c.text.slice(0, 280),
      })),
      source: "llm",
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM request failed";
    console.warn("[platform-intelligence] LLM failed", message);
    return unknownAnswer({
      question,
      answer: `Model Router failed (${message}). Retrieved sources are listed below — open them directly. I will not invent an answer.`,
      source: "llm_error",
      retrieved,
    });
  }
}

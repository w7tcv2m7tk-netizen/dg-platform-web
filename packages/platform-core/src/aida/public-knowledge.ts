import { PLATFORM_DOCS_CATALOG } from "../command-centre/platform-docs";

/**
 * Public-safe Platform Docs slugs for Ask Aida.
 * Excludes staff SOPs, partner commercials, decisions, and implementation briefs.
 */
export const PUBLIC_AIDA_DOC_SLUGS = [
  "connected-business",
  "business-brain",
  "business-body",
  "knowledge-layers",
  "operator-experience",
  "intelligent-layer",
  "capability-model",
  "app-hierarchy",
  "industry-platform",
] as const;

export type PublicAidaDocSlug = (typeof PUBLIC_AIDA_DOC_SLUGS)[number];

const PUBLIC_SLUG_SET = new Set<string>(PUBLIC_AIDA_DOC_SLUGS);

export function isPublicAidaDocSlug(slug: string): boolean {
  return PUBLIC_SLUG_SET.has(slug);
}

/** Drop anything that is not on the public allowlist — including staff SOPs passed by mistake. */
export function filterPublicAidaDocs<T extends { slug: string }>(docs: T[]): T[] {
  return docs.filter((doc) => isPublicAidaDocSlug(doc.slug));
}

export function publicAidaDocCatalog() {
  return PLATFORM_DOCS_CATALOG.filter((d) => PUBLIC_SLUG_SET.has(d.slug));
}

/** Always-on product briefing — not customer Business Brain data. */
export function publicAidaProductBriefing(pricingBrief?: string): string {
  const pricing =
    pricingBrief?.trim() ||
    [
      "Published platform pricing (authoritative catalog):",
      "- Starter — $99/month — 1 user — Platform Core, CRM & Dashboard, AI Assistant, Digital Twin snapshot.",
      "- Growth — $249/month — 5 users — automation & workflows, email + SMS, websites, advanced reporting.",
      "- Scale — $499/month — unlimited users — advanced AI & automation, API access, multiple pipelines, advanced permissions & BI.",
      "- Enterprise — custom — white label, priority support & SLA, custom integrations.",
      "Optional add-ons include Extra Users (+$29/user) and White Label (+$199/mo).",
      "Selected Growth Apps are billed separately (e.g. Prospecting +$99/mo, AI Visibility +$99/mo, SEO +$99/mo, Automation +$49/mo).",
      "If a visitor asks for a discount, custom quote, or unpublished packaging, do not invent it — offer to pass them to the DigitalGate team.",
    ].join("\n");

  return [
    "DigitalGate is an AI-powered Business Operating Platform.",
    "Proposition: Connect your business. Give it a brain.",
    "Tagline: The Gateway to Your Digital World.",
    "Aida is DigitalGate’s AI Business Advisor — the human-facing identity of the intelligence layer. She is AI, not a person.",
    "She learns a business, connects the dots across its digital world, and helps decide what to do next.",
    "Business Brain gives DigitalGate contextual understanding of an organisation so AI can provide more relevant insight than a generic assistant. Business Brain provides the context; Aida helps turn that context into understanding, recommendations and opportunities.",
    "Core capabilities (high level): CRM, websites (Design Studio), automation, communications (email/SMS), analytics, payments/commerce, AI / Business Brain, and industry capabilities (e.g. real estate, accommodation) where relevant.",
    "DigitalGate connects a business’s existing tools and data rather than asking every customer to replace everything at once.",
    "Public website links you may offer (same host): / (home), /pricing, /contact, /founding-customers, /about. Strategy-session / booking paths currently go to /contact.",
    "Do not invent integrations, certifications, guarantees, customer names, results, or unpublished features.",
    pricing,
  ].join("\n");
}

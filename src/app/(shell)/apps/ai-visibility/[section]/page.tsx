import Link from "next/link";
import { notFound } from "next/navigation";

import { AiVisibilitySectionNav } from "@/components/ai-visibility/AiVisibilitySectionNav";

const sections = {
  presence: {
    title: "AI Presence",
    eyebrow: "Answer-engine monitoring",
    description:
      "Track whether your business is mentioned, recommended and accurately represented across supported AI answer engines.",
    emptyTitle: "Verified presence monitoring is not active yet",
    emptyBody:
      "DigitalGate will only populate this section from captured answer-engine evidence. Until that monitoring layer is connected, mentions, rankings and recommendation positions remain unavailable rather than estimated.",
    bullets: [
      "Brand mentions and recommendation frequency",
      "Platform-by-platform visibility",
      "Recommendation position and answer context",
      "Accuracy and sentiment of generated answers",
    ],
  },
  prompts: {
    title: "Prompts",
    eyebrow: "Governed query set",
    description:
      "Build the commercial, local, category, comparison and branded prompt set used to measure real AI visibility.",
    emptyTitle: "Prompt monitoring set not configured yet",
    emptyBody:
      "The next monitoring layer will derive candidate prompts from the Business Brain, then let the organisation govern which prompts are tracked. Nothing is being silently invented or counted today.",
    bullets: [
      "Branded and non-branded prompts",
      "Commercial-intent and comparison prompts",
      "Local and industry-specific discovery prompts",
      "Prompt history, status and monitoring cadence",
    ],
  },
  competitors: {
    title: "Competitors",
    eyebrow: "AI share of voice",
    description:
      "Compare verified recommendation visibility against the businesses that compete for the same AI-generated answers.",
    emptyTitle: "Competitive Share is not measured yet",
    emptyBody:
      "Competitor share will be calculated from the same governed prompt set and captured answer evidence as your own AI Presence. DigitalGate will not infer share of voice from SEO rankings alone.",
    bullets: [
      "AI Share of Voice by competitor",
      "Platform and topic breakdowns",
      "Prompts where competitors win and you do not",
      "Movement over time",
    ],
  },
  citations: {
    title: "Citations",
    eyebrow: "Source intelligence",
    description:
      "Understand which domains and pages AI systems rely on when answering questions in your market.",
    emptyTitle: "Verified citation evidence is not available yet",
    emptyBody:
      "Once answer monitoring captures source references, this section will show your own cited pages, trusted third-party sources, competitor citations and authority gaps.",
    bullets: [
      "Your cited pages and source quality",
      "Third-party domains AI systems trust",
      "Competitor pages cited where you are absent",
      "Authority and digital PR opportunities",
    ],
  },
  opportunities: {
    title: "Opportunities",
    eyebrow: "Aida action layer",
    description:
      "Turn measured AI visibility gaps into prioritised, explainable growth actions across DigitalGate.",
    emptyTitle: "Opportunity scoring will expand with monitoring evidence",
    emptyBody:
      "Today Aida can act on verified website readiness and Business Brain context. As Presence, Citations and Competitive Share come online, opportunities will be ranked from those observed gaps as well.",
    bullets: [
      "Highest-impact visibility gaps",
      "Recommended content and entity actions",
      "Citation and authority opportunities",
      "Deep links into SEO, Websites, Reputation and Business Brain",
    ],
  },
  technical: {
    title: "Technical & methodology",
    eyebrow: "Evidence model",
    description:
      "See exactly what DigitalGate measures today and how the current AI Readiness layer is constructed.",
    emptyTitle: "Current measured layer: AI Readiness",
    emptyBody:
      "The production score uses observable website evidence such as reachability, HTTPS, structured data, Open Graph and semantic page signals. It does not claim to measure ChatGPT, Gemini, Copilot, Google AI or Perplexity visibility until verified monitoring evidence exists.",
    bullets: [
      "Technical access: reachability, HTTPS and mobile viewport",
      "Entity clarity: structured data and page identity",
      "Content semantics: title, meta description and H1",
      "Distribution readiness: Open Graph and share metadata",
    ],
  },
} as const;

type SectionKey = keyof typeof sections;

export default async function AiVisibilitySectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!(section in sections)) notFound();
  const config = sections[section as SectionKey];

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">{config.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold text-white">{config.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">{config.description}</p>
      </header>
      <main className="dg-page-main space-y-6">
        <AiVisibilitySectionNav />

        <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-950/60 to-slate-950/30 p-5 sm:p-6">
          <div className="max-w-3xl">
            <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Evidence-first
            </span>
            <h2 className="mt-4 text-xl font-semibold text-white">{config.emptyTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{config.emptyBody}</p>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {config.bullets.map((bullet) => (
            <div key={bullet} className="dg-card">
              <div className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                <p className="text-sm text-slate-300">{bullet}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">What is live today?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            AI Readiness is already measured from domain-matched website evidence. Return to Overview to inspect the current score, historical audits, evidence coverage and Aida recommendations.
          </p>
          <Link href="/apps/ai-visibility" className="mt-4 inline-block text-sm font-medium text-violet-300 hover:underline">
            Back to AI Visibility Overview →
          </Link>
        </section>
      </main>
    </>
  );
}

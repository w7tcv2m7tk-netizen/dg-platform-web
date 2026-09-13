import {
  buildAiVisibilityPromptSuggestions,
  getAiVisibilityIntelligenceSnapshot,
  getOrganisationBusinessProfile,
  listAiVisibilityCompetitors,
  listAiVisibilityObservationEvidence,
  listAiVisibilityPrompts,
} from "@dg/platform-core";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AiVisibilityCompetitorsManager } from "@/components/ai-visibility/AiVisibilityCompetitorsManager";
import { AiVisibilityEvidenceOpportunities } from "@/components/ai-visibility/AiVisibilityEvidenceOpportunities";
import { AiVisibilityMonitorRunner } from "@/components/ai-visibility/AiVisibilityMonitorRunner";
import { AiVisibilityObservationHistory } from "@/components/ai-visibility/AiVisibilityObservationHistory";
import { AiVisibilityPromptsManager } from "@/components/ai-visibility/AiVisibilityPromptsManager";
import { AiVisibilitySectionNav } from "@/components/ai-visibility/AiVisibilitySectionNav";
import { getPlatformPageContext } from "@/lib/org-apps";

const sections = {
  presence: {
    title: "AI Presence",
    eyebrow: "AI model observation",
    description:
      "Measure whether your business is actually mentioned in captured AI model answers, with the exact provider and model retained as evidence.",
    emptyTitle: "No AI model observations yet",
    emptyBody:
      "Run an observation below to capture real API-model answers from your approved prompts. Consumer ChatGPT, Gemini, Copilot and Perplexity interface rankings remain unavailable unless those surfaces are separately and legitimately observed.",
    bullets: [
      "Verified business mentions in captured answers",
      "Exact model and provider provenance",
      "Configured competitor mentions from the same answers",
      "Historical evidence that can be re-measured over time",
    ],
  },
  prompts: {
    title: "Prompts",
    eyebrow: "Governed query set",
    description:
      "Build the commercial, local, category, comparison and branded prompt set used to measure real AI visibility.",
    emptyTitle: "Govern the questions that matter",
    emptyBody:
      "Business-grounded candidates can now be reviewed and added to the organisation's prompt set. Adding a prompt does not create monitoring evidence; it only governs what future monitoring is allowed to observe.",
    bullets: [
      "Branded and non-branded prompts",
      "Commercial-intent and comparison prompts",
      "Local and industry-specific discovery prompts",
      "Prompt status and provenance",
    ],
  },
  competitors: {
    title: "Competitors",
    eyebrow: "AI share of voice",
    description:
      "Compare verified mention visibility against the businesses configured for the same captured AI answers.",
    emptyTitle: "Define the real competitive set",
    emptyBody:
      "Competitors can now be governed per organisation. Competitive Share remains unavailable until the same monitored responses have complete competitor capture.",
    bullets: [
      "Organisation-specific monitored competitors",
      "AI Share of Voice from captured responses",
      "Prompts where competitors appear and you do not",
      "Model and topic breakdowns once evidence exists",
    ],
  },
  citations: {
    title: "Citations",
    eyebrow: "Source intelligence",
    description:
      "Understand which domains and pages AI systems rely on when citation evidence can be captured and verified.",
    emptyTitle: "Verified citation evidence is not available yet",
    emptyBody:
      "The current API-model observation runner does not infer citations. Once a monitoring source captures source references and confirms citation completeness, this section will show your own cited pages, third-party sources and authority gaps.",
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
    emptyTitle: "Opportunity scoring expands only with evidence",
    emptyBody:
      "Aida can act on verified website readiness, Business Brain context and persisted model observations. Citations and recommendation position only influence recommendations once those signals are genuinely captured.",
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
      "See exactly what DigitalGate measures, how observations are sourced and which signals remain unavailable.",
    emptyTitle: "Evidence-first measurement",
    emptyBody:
      "AI Readiness uses observable website evidence. AI Presence can additionally use persisted API-model observations with exact provider/model provenance. DigitalGate does not relabel those observations as consumer ChatGPT, Gemini, Copilot or Perplexity rankings.",
    bullets: [
      "Technical access: reachability, HTTPS and mobile viewport",
      "Entity clarity: structured data and page identity",
      "AI Presence: persisted API-model answer observations",
      "Unavailable signals remain excluded rather than estimated",
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
  const sectionKey = section as SectionKey;
  const config = sections[sectionKey];

  let prompts: Awaited<ReturnType<typeof listAiVisibilityPrompts>> = [];
  let competitors: Awaited<ReturnType<typeof listAiVisibilityCompetitors>> = [];
  let observations: Awaited<ReturnType<typeof listAiVisibilityObservationEvidence>> = [];
  let suggestions: ReturnType<typeof buildAiVisibilityPromptSuggestions> = [];
  let intelligence: Awaited<ReturnType<typeof getAiVisibilityIntelligenceSnapshot>> | null = null;

  try {
    const { session } = await getPlatformPageContext();
    if (session) {
      const [profile, promptRows, competitorRows, snapshot, observationRows] = await Promise.all([
        getOrganisationBusinessProfile(session.organisationId),
        listAiVisibilityPrompts(session.organisationId),
        listAiVisibilityCompetitors(session.organisationId),
        getAiVisibilityIntelligenceSnapshot(session.organisationId),
        sectionKey === "presence" || sectionKey === "opportunities"
          ? listAiVisibilityObservationEvidence({ organisationId: session.organisationId, limit: 100 })
          : Promise.resolve([]),
      ]);
      prompts = promptRows;
      competitors = competitorRows;
      observations = observationRows;
      intelligence = snapshot;
      suggestions = buildAiVisibilityPromptSuggestions({
        businessName: profile?.tradingName ?? profile?.businessName ?? null,
        industry: profile?.industryVertical ?? null,
        location: profile?.address
          ? [profile.address.city, profile.address.state].filter(Boolean).join(", ")
          : null,
      });
    }
  } catch (error) {
    console.error("[ai-visibility] section intelligence load failed", error);
  }

  const dimensionId =
    sectionKey === "presence"
      ? "ai_presence"
      : sectionKey === "citations"
        ? "citation_strength"
        : sectionKey === "competitors"
          ? "competitive_share"
          : null;
  const dimension = dimensionId
    ? intelligence?.dimensions.find((item) => item.id === dimensionId) ?? null
    : null;
  const activePrompts =
    intelligence?.evidenceCoverage.activePrompts ?? prompts.filter((item) => item.status === "active").length;
  const activeCompetitors =
    intelligence?.evidenceCoverage.activeCompetitors ?? competitors.filter((item) => item.status === "active").length;

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">{config.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold text-white">{config.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">{config.description}</p>
      </header>
      <main className="dg-page-main space-y-6">
        <AiVisibilitySectionNav />

        {sectionKey === "presence" ? (
          <>
            <AiVisibilityMonitorRunner activePrompts={activePrompts} />
            <AiVisibilityObservationHistory observations={observations} />
          </>
        ) : null}

        {sectionKey === "opportunities" ? (
          <AiVisibilityEvidenceOpportunities
            observations={observations}
            activePrompts={activePrompts}
            activeCompetitors={activeCompetitors}
          />
        ) : null}

        {sectionKey === "prompts" ? (
          <AiVisibilityPromptsManager initialItems={prompts} suggestions={suggestions} />
        ) : sectionKey === "competitors" ? (
          <AiVisibilityCompetitorsManager initialItems={competitors} />
        ) : (
          <>
            <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-950/60 to-slate-950/30 p-5 sm:p-6">
              <div className="max-w-3xl">
                <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Evidence-first
                </span>
                <h2 className="mt-4 text-xl font-semibold text-white">
                  {dimension?.available ? `${dimension.label}: ${dimension.value}/100` : config.emptyTitle}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {dimension?.available ? dimension.explanation : config.emptyBody}
                </p>
                {dimension ? (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full border border-slate-800 px-2.5 py-1">{dimension.coverage}</span>
                    <span className="rounded-full border border-slate-800 px-2.5 py-1">{dimension.evidenceSource}</span>
                  </div>
                ) : null}
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
          </>
        )}

        <section className="dg-card">
          <h2 className="font-semibold text-white">Evidence coverage</h2>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-800 p-3">
              <span className="text-slate-500">Active prompts</span>
              <p className="mt-1 text-xl font-semibold text-white">{activePrompts}</p>
            </div>
            <div className="rounded-lg border border-slate-800 p-3">
              <span className="text-slate-500">Competitors</span>
              <p className="mt-1 text-xl font-semibold text-white">{activeCompetitors}</p>
            </div>
            <div className="rounded-lg border border-slate-800 p-3">
              <span className="text-slate-500">Observations</span>
              <p className="mt-1 text-xl font-semibold text-white">{intelligence?.evidenceCoverage.observations ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-800 p-3">
              <span className="text-slate-500">Overall monitored score</span>
              <p className="mt-1 text-xl font-semibold text-white">
                {intelligence?.overallScore == null ? "—" : intelligence.overallScore}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            A score is calculated only from dimensions backed by captured evidence. Missing monitoring coverage remains unavailable, never zero.
          </p>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">What is live today?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            AI Readiness is measured from domain-matched website evidence. Prompt and competitor governance are live, and AI Presence can now be measured from persisted API-model observations. Consumer answer-engine interface rankings and citation scores remain unavailable until those specific signals are genuinely captured.
          </p>
          <Link href="/apps/ai-visibility" className="mt-4 inline-block text-sm font-medium text-violet-300 hover:underline">
            Back to AI Visibility Overview →
          </Link>
        </section>
      </main>
    </>
  );
}

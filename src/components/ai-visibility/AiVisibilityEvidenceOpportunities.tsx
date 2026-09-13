import type { AiVisibilityObservationEvidence } from "@dg/platform-core";

import { ResolutionAction } from "@/components/ui/ResolutionAction";

type Opportunity = {
  id: string;
  priority: "high" | "medium";
  title: string;
  detail: string;
  evidence: string;
  href: string;
};

function formatObservedAt(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date(value));
}

function latestPerPrompt(observations: AiVisibilityObservationEvidence[]) {
  const seen = new Set<string>();
  return observations.filter((observation) => {
    if (seen.has(observation.prompt.id)) return false;
    seen.add(observation.prompt.id);
    return true;
  });
}

function buildOpportunities(observations: AiVisibilityObservationEvidence[]): Opportunity[] {
  return latestPerPrompt(observations).flatMap((observation) => {
    if (observation.brandMentioned) return [];

    const mentionedCompetitors = observation.competitorMentions.filter((item) => item.mentioned);
    const model = observation.engineModel || observation.engine;
    const provider = observation.provider ? `${observation.provider} / ${model}` : model;
    const evidence = `${formatObservedAt(observation.observedAt)} · ${provider} · “${observation.prompt.promptText}”`;

    if (observation.competitorCaptureComplete === true && mentionedCompetitors.length > 0) {
      return [{
        id: observation.id,
        priority: "high" as const,
        title: "Competitors appeared while your business was absent",
        detail: `${mentionedCompetitors.map((item) => item.name).join(", ")} appeared in the latest captured answer for this governed prompt, while your business was not explicitly mentioned. Strengthen the page/entity signals that support this topic before the next measurement.`,
        evidence,
        href: "/apps/seo",
      }];
    }

    return [{
      id: observation.id,
      priority: "medium" as const,
      title: "Your business was absent from a monitored answer",
      detail:
        "The latest captured answer for this governed prompt did not explicitly mention your business. Review the topic, entity clarity and supporting website content, then re-run the observation to verify whether visibility improves.",
      evidence,
      href: "/apps/seo",
    }];
  });
}

export function AiVisibilityEvidenceOpportunities({
  observations,
  activePrompts,
  activeCompetitors,
}: {
  observations: AiVisibilityObservationEvidence[];
  activePrompts: number;
  activeCompetitors: number;
}) {
  if (activePrompts === 0) {
    return (
      <section className="dg-card border-violet-500/20">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">Next best action</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Create the prompts that matter to your customers</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          DigitalGate needs at least one governed prompt before it can measure AI Presence or identify evidence-backed visibility gaps.
        </p>
        <ResolutionAction href="/apps/ai-visibility/prompts" mode="guided" className="mt-4" />
      </section>
    );
  }

  if (!observations.length) {
    return (
      <section className="dg-card border-violet-500/20">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">Next best action</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Create the first real observation</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Your prompt set is ready, but there is no captured model evidence yet. Run an observation before DigitalGate recommends visibility work from monitoring data.
        </p>
        <ResolutionAction href="/apps/ai-visibility/presence" mode="guided" label="Run observation" className="mt-4" />
      </section>
    );
  }

  const opportunities = buildOpportunities(observations);

  return (
    <section className="dg-card border-violet-500/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">Measured opportunities</p>
          <h2 className="mt-1 text-lg font-semibold text-white">What the latest evidence says to improve</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
            Only the newest stored observation for each governed prompt is used here. Older results do not override newer evidence.
          </p>
        </div>
        <span className="w-fit rounded-full border border-slate-800 px-2.5 py-1 text-xs text-slate-500">
          {opportunities.length} open
        </span>
      </div>

      {opportunities.length ? (
        <div className="mt-5 space-y-3">
          {opportunities.slice(0, 8).map((opportunity) => (
            <article key={opportunity.id} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 max-w-3xl">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${opportunity.priority === "high" ? "border-rose-500/25 bg-rose-500/10 text-rose-300" : "border-amber-500/25 bg-amber-500/10 text-amber-200"}`}>
                    {opportunity.priority} priority
                  </span>
                  <h3 className="mt-3 font-semibold text-white">{opportunity.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{opportunity.detail}</p>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600">Evidence: {opportunity.evidence}</p>
                </div>
                <ResolutionAction href={opportunity.href} mode="guided" className="shrink-0" />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="font-semibold text-emerald-200">No monitored mention gaps in the latest evidence</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            Your business was explicitly mentioned in the latest stored observation for every monitored prompt currently represented in the evidence ledger. Keep measuring before treating this as permanent visibility.
          </p>
        </div>
      )}

      {activeCompetitors === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-800 p-4">
          <h3 className="font-medium text-white">Add a competitive baseline</h3>
          <p className="mt-1 text-sm text-slate-400">
            No competitors are configured, so DigitalGate cannot yet identify prompts where another business appears and you do not.
          </p>
          <ResolutionAction href="/apps/ai-visibility/competitors" mode="guided" label="Configure competitors" className="mt-3" />
        </div>
      ) : null}

      <p className="mt-4 text-xs text-slate-500">
        These actions are derived from persisted observation evidence. They do not claim consumer ChatGPT, Gemini, Copilot or Perplexity rankings unless those surfaces are separately captured.
      </p>
    </section>
  );
}

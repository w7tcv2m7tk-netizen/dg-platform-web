import type { AiVisibilityObservationEvidence } from "@dg/platform-core";

function formatObservedAt(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AiVisibilityObservationHistory({
  observations,
}: {
  observations: AiVisibilityObservationEvidence[];
}) {
  if (!observations.length) {
    return (
      <section className="dg-card">
        <h2 className="font-semibold text-white">Observation evidence</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          No stored observations yet. Run a real AI model observation above to create the first evidence record.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          DigitalGate does not manufacture missing rankings, citations or recommendation positions. Signals remain unavailable until they are actually captured.
        </p>
      </section>
    );
  }

  return (
    <section className="dg-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">Evidence ledger</p>
          <h2 className="mt-1 font-semibold text-white">Recent AI observations</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Every result below is tied to the exact governed prompt, observation time and stored provider/model evidence.
          </p>
        </div>
        <span className="w-fit rounded-full border border-slate-800 px-2.5 py-1 text-xs text-slate-500">
          {observations.length} shown
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {observations.map((observation) => {
          const mentionedCompetitors = observation.competitorMentions.filter((item) => item.mentioned);
          const modelLabel = observation.engineModel || observation.engine;
          const isModelApi = observation.observationSurface === "model_api" || observation.engine.startsWith("model-api:");

          return (
            <details key={observation.id} className="group rounded-xl border border-slate-800 bg-slate-950/35 open:border-violet-500/30">
              <summary className="cursor-pointer list-none p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-200">
                        {isModelApi ? "Model API" : titleCase(observation.observationSurface || observation.engine)}
                      </span>
                      <span className="rounded-full border border-slate-800 px-2.5 py-1 text-[11px] text-slate-400">
                        {observation.provider ? `${observation.provider} · ${modelLabel}` : modelLabel}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${observation.brandMentioned ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-400"}`}>
                        {observation.brandMentioned ? "Business mentioned" : "Business not mentioned"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-slate-200">{observation.prompt.promptText}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatObservedAt(observation.observedAt)} · {titleCase(observation.prompt.promptClass)} · {observation.prompt.locale}/{observation.prompt.market}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-violet-300 group-open:hidden">View evidence ↓</span>
                  <span className="hidden shrink-0 text-xs text-violet-300 group-open:inline">Hide evidence ↑</span>
                </div>
              </summary>

              <div className="border-t border-slate-800 px-4 pb-5 pt-4 sm:px-5">
                {isModelApi ? (
                  <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-100/80">
                    Stored API-model observation. This is evidence from the recorded provider/model, not a consumer ChatGPT, Gemini, Copilot or Perplexity interface ranking.
                  </div>
                ) : null}

                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Captured answer</h3>
                <div className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-sm leading-relaxed text-slate-300">
                  {observation.answerContext || "No answer text was retained for this observation."}
                </div>

                <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-slate-800 p-3">
                    <span className="text-slate-500">Citation capture</span>
                    <p className="mt-1 font-medium text-slate-200">
                      {observation.citationCaptureComplete === true ? "Complete" : observation.citationCaptureComplete === false ? "Unavailable for this observation" : "Not confirmed"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 p-3">
                    <span className="text-slate-500">Competitor capture</span>
                    <p className="mt-1 font-medium text-slate-200">
                      {observation.competitorCaptureComplete === true ? "Complete for configured competitors" : observation.competitorCaptureComplete === false ? "Unavailable" : "Not confirmed"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 p-3">
                    <span className="text-slate-500">Recommendation position</span>
                    <p className="mt-1 font-medium text-slate-200">{observation.answerRank == null ? "Not captured" : `Position ${observation.answerRank}`}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 p-3">
                    <span className="text-slate-500">Citations retained</span>
                    <p className="mt-1 font-medium text-slate-200">{observation.citations.length}</p>
                  </div>
                </div>

                {mentionedCompetitors.length ? (
                  <div className="mt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Configured competitors mentioned</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {mentionedCompetitors.map((item) => (
                        <span key={item.competitorId} className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">
                          {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {observation.citations.length ? (
                  <div className="mt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Captured citations</h3>
                    <div className="mt-2 space-y-2">
                      {observation.citations.map((citation) => (
                        <div key={citation.id} className="rounded-lg border border-slate-800 p-3 text-xs text-slate-300">
                          <span className="font-medium text-white">{citation.sourceDomain}</span>
                          <span className="ml-2 text-slate-500">{titleCase(citation.sourceType)}</span>
                          <p className="mt-1 break-all text-slate-500">{citation.citedUrl}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {observation.sourceRef ? (
                  <p className="mt-4 break-all text-[11px] text-slate-600">Evidence reference: {observation.sourceRef}</p>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

import Link from "next/link";

import { loadBusinessBrainSources } from "@/lib/business-brain-sources";

function stateClasses(state: string) {
  if (state === "approved") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (state === "proposed") return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  if (state === "reviewed") return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  return "border-sky-400/20 bg-sky-400/10 text-sky-200";
}

function sourceTypeLabel(type: string) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function BusinessBrainSourcesPage() {
  const data = await loadBusinessBrainSources();

  if (!data) {
    return (
      <main className="dg-page-main">
        <p className="text-sm text-slate-400">Sign in to view Business Brain sources.</p>
      </main>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-sky-400/90">
          Business · Business Brain · Sources
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Sources &amp; provenance</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              See what feeds {data.organisationName}&apos;s Business Brain, what still needs review,
              and the approved knowledge Aida is permitted to use.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/dashboard/brain" className="text-sky-400 hover:underline">
              Business Brain →
            </Link>
            <Link href="/dashboard/brain/knowledge" className="text-sky-400 hover:underline">
              Knowledge Inbox →
            </Link>
            <Link href="/apps/documents/library" className="text-sky-400 hover:underline">
              Documents →
            </Link>
          </div>
        </div>
      </header>

      <main className="dg-page-main space-y-6">
        <section className="rounded-2xl border border-sky-400/15 bg-sky-400/[0.05] p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sky-200">
              ✦
            </div>
            <div>
              <h2 className="font-semibold text-white">What Aida can use</h2>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-300">
                Aida&apos;s governed Business Brain retrieval uses approved, current knowledge only.
                Proposed, rejected, archived and superseded items are excluded until the governance
                state changes.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Knowledge sources", data.summary.sourceCount],
            ["Organisation documents", data.summary.documentCount],
            ["Approved for Aida", data.summary.approvedItemCount],
            ["Awaiting review", data.summary.proposedItemCount],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-white">Documents feeding the Business Brain</h2>
            <p className="mt-1 text-sm text-slate-400">
              Documents are organisation-owned. A document only contributes to Aida after extracted
              knowledge has been reviewed and approved.
            </p>
          </div>
          <div className="divide-y divide-slate-800">
            {data.documents.length ? (
              data.documents.map((document) => (
                <div key={document.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{document.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {document.mimeType} · version {document.version} · updated {formatDate(document.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full border px-2.5 py-1 font-medium ${stateClasses(document.knowledgeState)}`}>
                      {document.knowledgeState === "not_ingested"
                        ? "Not sent to Brain"
                        : document.knowledgeState === "proposed"
                          ? `${document.proposedCount} awaiting review`
                          : document.knowledgeState === "approved"
                            ? `${document.approvedCount} approved`
                            : "Reviewed"}
                    </span>
                    {document.rejectedCount > 0 ? (
                      <span className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-400">
                        {document.rejectedCount} rejected
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-sm text-slate-400">
                No organisation documents are available yet. Add files in Documents to build governed knowledge.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-white">All knowledge sources</h2>
            <p className="mt-1 text-sm text-slate-400">
              Provenance across documents, user entries, platform activity, integrations and other governed sources.
            </p>
          </div>
          <div className="divide-y divide-slate-800">
            {data.sources.length ? (
              data.sources.map((source) => (
                <div key={source.id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-white">{source.title}</p>
                        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">
                          {sourceTypeLabel(source.type)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {source.app ? `${source.app} · ` : ""}{source.ref} · captured {formatDate(source.capturedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {source.approvedCount > 0 ? (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">
                          {source.approvedCount} approved
                        </span>
                      ) : null}
                      {source.proposedCount > 0 ? (
                        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-200">
                          {source.proposedCount} proposed
                        </span>
                      ) : null}
                      <span className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-400">
                        {source.accessClassification}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-sm text-slate-400">
                No governed Business Brain sources have been captured yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-white">Approved knowledge Aida can use now</h2>
            <p className="mt-1 text-sm text-slate-400">
              This is the current governed knowledge set available to normal Business Brain retrieval.
            </p>
          </div>
          <div className="divide-y divide-slate-800">
            {data.approvedKnowledge.length ? (
              data.approvedKnowledge.map((item) => (
                <article key={item.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-emerald-200">
                      Approved
                    </span>
                    <span className="text-slate-500">{sourceTypeLabel(item.type)}</span>
                    {item.confidence != null ? (
                      <span className="text-slate-500">{Math.round(item.confidence * 100)}% confidence</span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 font-medium text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{item.statement}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {item.sourceRef ? <span className="truncate">Source: {item.sourceRef}</span> : <span>Source: direct knowledge</span>}
                    {item.scope.length ? <span>Scope: {item.scope.join(", ")}</span> : null}
                    {item.approvedAt ? <span>Approved {formatDate(item.approvedAt.toISOString())}</span> : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="px-5 py-8 text-sm text-slate-400">
                No approved knowledge is available yet. Review proposed items in the Knowledge Inbox before Aida can use them.
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

import Link from "next/link";
import { connection } from "next/server";
import { llmConfigured } from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { PlatformIntelligencePanel } from "@/components/command/PlatformIntelligencePanel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CommandIntelligencePage() {
  await connection();
  const modelReady = llmConfigured();
  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
          Platform Intelligence · Phase 1
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Platform Intelligence</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Staff RAG over the curated Platform docs allowlist. Answers cite{" "}
          <code className="text-slate-300">docs/</code> paths with explicit confidence —
          Confirmed / Likely / Unknown. Not live org tools yet; floating support chat is
          unchanged.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="intelligence" />

        <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
          Retrieval is keyword + chunk similarity over allowlisted markdown (no vector DB).
          Synthesis uses Model Router when keyed.
          {modelReady ? (
            <span className="ml-1 text-emerald-300">Model Router configured.</span>
          ) : (
            <span className="ml-1 text-amber-200">
              Set OPENAI_API_KEY or ANTHROPIC_API_KEY to synthesise answers.
            </span>
          )}{" "}
          Browse sources in{" "}
          <Link href="/command/docs" className="text-sky-400 hover:underline">
            Platform docs
          </Link>
          .
        </div>

        <PlatformIntelligencePanel />
      </main>
    </>
  );
}

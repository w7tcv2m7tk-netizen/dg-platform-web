"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { IntelligenceFlow } from "@/components/intelligence/IntelligenceFlow";
import { IntelligenceHierarchy } from "@/components/intelligence/IntelligenceHierarchy";
import type {
  AdvisorActionPriority,
  AdvisorContextId,
  AdvisorQuestionId,
  AdvisorRecommendation,
  BusinessAdvisorBundle,
} from "@dg/platform-core";

function priorityClass(level: AdvisorActionPriority) {
  if (level === "high") return "border-rose-500/35 text-rose-100";
  if (level === "medium") return "border-amber-500/35 text-amber-100";
  return "border-slate-600 text-slate-300";
}

function priorityLabel(level: AdvisorActionPriority) {
  if (level === "high") return "High priority";
  if (level === "medium") return "Medium priority";
  return "Low priority";
}

function RecommendedActionCard({
  item,
  index,
}: {
  item: AdvisorRecommendation;
  index: number;
}) {
  return (
    <article
      className={`rounded-xl border bg-slate-950/50 px-5 py-5 ${priorityClass(item.priorityLevel)}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-lg font-semibold text-white">
          {index + 1}. {item.title}
        </span>
      </div>
      <p className="mt-1 text-xs uppercase tracking-wide opacity-80">
        {priorityLabel(item.priorityLevel)} · {item.category}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-200">{item.whatISee}</p>
      <p className="mt-2 text-sm text-slate-400">
        <span className="text-slate-300">Recommended action:</span> {item.whatIRecommend}
      </p>
      <Link
        href={item.href}
        className="mt-4 inline-block rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
      >
        {item.actionLabel}
      </Link>
    </article>
  );
}

export function AiAdvisorDashboard({ data }: { data: BusinessAdvisorBundle }) {
  const [contextId, setContextId] = useState<AdvisorContextId>("entire_business");
  const [question, setQuestion] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<AdvisorQuestionId>("today");
  const [pending, startTransition] = useTransition();

  const activeAnswer =
    data.questionAnswers.find((answer) => answer.id === selectedQuestion) ??
    data.questionAnswers.find((answer) => answer.id === "today") ??
    data.questionAnswers[0];

  const visibleRecommendations =
    activeAnswer?.recommendations.length > 0
      ? activeAnswer.recommendations
      : data.topRecommendations;

  function matchExample(example: string) {
    const exact = data.suggestedQuestions.find(
      (q) => q.label.toLowerCase() === example.toLowerCase(),
    );
    startTransition(() => {
      setQuestion(example);
      if (exact) {
        setSelectedQuestion(exact.id);
        return;
      }
      const lower = example.toLowerCase();
      if (lower.includes("lead")) setSelectedQuestion("leads_dropped");
      else if (lower.includes("focus")) setSelectedQuestion("focus_this_week");
      else if (lower.includes("opportunit")) setSelectedQuestion("losing_opportunities");
      else if (lower.includes("health")) setSelectedQuestion("business_health");
      else if (lower.includes("automat")) setSelectedQuestion("automate");
      else if (lower.includes("summary")) setSelectedQuestion("owner_summary");
    });
  }

  function askAdvisor() {
    const trimmed = question.trim();
    if (!trimmed) {
      setSelectedQuestion("today");
      return;
    }
    const lower = trimmed.toLowerCase();
    const matched = data.suggestedQuestions.find((q) =>
      lower.includes(q.label.toLowerCase().slice(0, 18)),
    );
    if (matched) {
      setSelectedQuestion(matched.id);
      return;
    }
    if (lower.includes("lead")) setSelectedQuestion("leads_dropped");
    else if (lower.includes("health")) setSelectedQuestion("business_health");
    else if (lower.includes("automat")) setSelectedQuestion("automate");
    else if (lower.includes("opportunit")) setSelectedQuestion("losing_opportunities");
    else if (lower.includes("summary") || lower.includes("owner"))
      setSelectedQuestion("owner_summary");
    else if (lower.includes("focus") || lower.includes("today"))
      setSelectedQuestion("focus_this_week");
    else setSelectedQuestion("today");
  }

  return (
    <div className="space-y-8">
      {!data.scoresLive ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-200/90">
          Advisor deepens as CRM, website, and finance signals land.{" "}
          <Link href="/dashboard/settings/connectors" className="underline hover:text-white">
            Connectors →
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <span className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-xs text-slate-300">
          Business Brain {data.brainCompleteness}%
        </span>
        {data.businessHealth != null ? (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            Business Health {data.businessHealth}/100
          </span>
        ) : null}
        {data.benchmarkScore != null ? (
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
            Benchmarks {data.benchmarkScore}/100
            {data.benchmarkPercentile != null ? ` · ${data.benchmarkPercentile}th percentile` : ""}
          </span>
        ) : null}
      </div>

      {/* Ask your Advisor */}
      <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-slate-950/50 to-slate-950/40 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300/90">
          Ask your Advisor
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">What would you like help with?</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <label className="block text-sm">
            <span className="text-slate-400">Ask about</span>
            <select
              value={contextId}
              onChange={(e) => setContextId(e.target.value as AdvisorContextId)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-white"
            >
              {data.availableContexts.map((ctx) => (
                <option key={ctx.id} value={ctx.id}>
                  {ctx.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-slate-400">Organisation</span>
            <div className="mt-1 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-white">
              {data.organisationName}
            </div>
          </label>
        </div>

        <label className="mt-4 block text-sm">
          <span className="sr-only">Ask a question</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder="Ask a question or describe a problem..."
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-600"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => startTransition(() => askAdvisor())}
            disabled={pending}
            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
          >
            Ask Advisor →
          </button>
          <p className="text-xs text-slate-500">
            Context:{" "}
            {data.availableContexts.find((c) => c.id === contextId)?.label ?? "Entire Business"}
          </p>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Examples</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {data.askExamples.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => matchExample(example)}
                  className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-left text-xs text-slate-300 transition hover:border-violet-500/50 hover:text-white"
                >
                  “{example}”
                </button>
              </li>
            ))}
          </ul>
        </div>

        {activeAnswer ? (
          <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-widest text-violet-300/80">
              {activeAnswer.question}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{activeAnswer.summary}</p>
          </div>
        ) : null}
      </section>

      {/* Recommended Actions — prioritisation output */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-400/90">
              Recommended Actions
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              What DigitalGate thinks you should do next
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Prioritisation from Twin, Brain, Health and live signals — execute in Command Centre.
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-sky-400 hover:underline">
            Open Command Centre →
          </Link>
        </div>
        <ul className="mt-5 space-y-4">
          {visibleRecommendations.map((item, index) => (
            <li key={`${selectedQuestion}-${item.id}`}>
              <RecommendedActionCard item={item} index={index} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-800/80 bg-slate-950/20 px-5 py-4 text-sm text-slate-400">
        <p className="font-medium text-slate-300">How this fits together</p>
        <p className="mt-2">
          <span className="text-slate-200">AI Advisor</span> reasons ·{" "}
          <span className="text-slate-200">Recommended Actions</span> prioritise ·{" "}
          <span className="text-slate-200">Command Centre</span> executes.
        </p>
      </section>

      <IntelligenceFlow active="AI Advisor" />
      <IntelligenceHierarchy active="advisor" />

      <div className="flex flex-wrap gap-4 text-sm">
        <Link
          href="/dashboard"
          className="rounded-full bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500"
        >
          Open Command Centre →
        </Link>
        <Link href="/dashboard/brain" className="font-medium text-sky-400 hover:text-white">
          Explore Business Brain →
        </Link>
        <Link href="/dashboard/twin" className="font-medium text-sky-400 hover:text-white">
          View Digital Twin →
        </Link>
      </div>
    </div>
  );
}

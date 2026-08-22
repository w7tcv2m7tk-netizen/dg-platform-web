"use client";

import Link from "next/link";
import { useState } from "react";

import { IntelligenceFlow } from "@/components/intelligence/IntelligenceFlow";
import type {
  AdvisorQuestionId,
  AdvisorRecommendation,
  BusinessAdvisorBundle,
} from "@dg/platform-core";

function RecommendationCard({ item }: { item: AdvisorRecommendation }) {
  return (
    <article className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">What I see</p>
          <p className="mt-1 leading-relaxed text-slate-200">{item.whatISee}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Why it matters
          </p>
          <p className="mt-1 leading-relaxed text-slate-300">{item.whyItMatters}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            What I recommend
          </p>
          <p className="mt-1 leading-relaxed text-slate-200">{item.whatIRecommend}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            What DigitalGate can do
          </p>
          <p className="mt-1 leading-relaxed text-slate-300">{item.whatDigitalGateCanDo}</p>
        </div>
      </div>
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
  const [selectedQuestion, setSelectedQuestion] = useState<AdvisorQuestionId>("today");
  const allQuestions = [
    { id: "today" as const, label: "What should I know about my business today?" },
    ...data.suggestedQuestions,
  ];
  const activeAnswer =
    data.questionAnswers.find((answer) => answer.id === selectedQuestion) ??
    data.questionAnswers.find((answer) => answer.id === "today") ??
    data.questionAnswers[0];
  const visibleRecommendations =
    activeAnswer?.recommendations.length > 0
      ? activeAnswer.recommendations
      : data.topRecommendations;

  return (
    <div className="space-y-6">
      {!data.scoresLive ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-200/90">
          Advisor preview — connect CRM, website, and finance data so recommendations reason from
          live business context.{" "}
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

      <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-950/40 to-slate-950/40 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-violet-300/90">
          Today&apos;s briefing
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">{data.todaySummary}</p>
      </section>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Ask DigitalGate
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Reason from your Business Brain, Digital Twin, Goals, Health, Benchmarks, and live
          activity.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {allQuestions.map((question) => {
            const activeChip = question.id === selectedQuestion;
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => setSelectedQuestion(question.id)}
                className={`rounded-full border px-3 py-1.5 text-left text-sm transition ${
                  activeChip
                    ? "border-violet-500/60 bg-violet-500/10 text-violet-100"
                    : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
                aria-pressed={activeChip}
              >
                {question.label}
              </button>
            );
          })}
        </div>
        {activeAnswer ? (
          <div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-widest text-violet-300/80">
              {activeAnswer.question}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{activeAnswer.summary}</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Recommended actions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            What I see · Why it matters · What I recommend · What DigitalGate can do
          </p>
        </div>
        {visibleRecommendations.map((item) => (
          <RecommendationCard key={`${selectedQuestion}-${item.id}`} item={item} />
        ))}
      </section>

      <IntelligenceFlow active="AI Advisor" />

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
      </div>
    </div>
  );
}

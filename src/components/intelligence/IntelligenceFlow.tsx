import Link from "next/link";

import {
  ANALYTICS_RELATED,
  INTELLIGENCE_ACTION,
  INTELLIGENCE_ANALYSIS,
  INTELLIGENCE_FOUNDATION,
  INTELLIGENCE_OUTPUT,
} from "./intelligence-model";

function FlowStep({
  label,
  question,
  href,
  isActive,
}: {
  label: string;
  question: string;
  href: string;
  isActive: boolean;
}) {
  if (isActive) {
    return (
      <div>
        <p className="font-medium text-violet-200">{label}</p>
        <p className="text-sm text-slate-400">{question}</p>
      </div>
    );
  }
  return (
    <Link href={href} className="block hover:text-sky-300">
      <p className="font-medium text-slate-300">{label}</p>
      <p className="text-sm text-slate-500">{question}</p>
    </Link>
  );
}

function Arrow() {
  return (
    <span className="mb-2 block text-center text-slate-600 sm:text-left" aria-hidden>
      ↓
    </span>
  );
}

export function IntelligenceFlow({ active = "AI Advisor" }: { active?: string }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/20 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
        Intelligence flow
      </p>
      <ol className="mt-3 space-y-3">
        {INTELLIGENCE_FOUNDATION.map((step, index) => (
          <li key={step.id}>
            {index > 0 ? <Arrow /> : null}
            <FlowStep
              label={step.label}
              question={step.question}
              href={step.href}
              isActive={step.label === active}
            />
          </li>
        ))}

        <li>
          <Arrow />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Intelligence
          </p>
          <ul className="mt-2 space-y-2 border-l border-slate-800 pl-3">
            {INTELLIGENCE_ANALYSIS.map((step) => (
              <li key={step.id} className="text-sm">
                <FlowStep
                  label={step.label}
                  question={step.question}
                  href={step.href}
                  isActive={step.label === active}
                />
              </li>
            ))}
          </ul>
        </li>

        {INTELLIGENCE_ACTION.map((step) => (
          <li key={step.id}>
            <Arrow />
            <FlowStep
              label={step.label}
              question={step.question}
              href={step.href}
              isActive={step.label === active}
            />
          </li>
        ))}

        <li className="pt-1">
          <div className="flex items-start gap-2 text-slate-600">
            <span aria-hidden>↘</span>
            <div className="flex-1">
              {INTELLIGENCE_OUTPUT.label === active ? (
                <div>
                  <p className="font-medium text-violet-200">{INTELLIGENCE_OUTPUT.label}</p>
                  <p className="text-sm text-slate-400">{INTELLIGENCE_OUTPUT.question}</p>
                </div>
              ) : (
                <Link href={INTELLIGENCE_OUTPUT.href} className="block hover:text-sky-300">
                  <p className="font-medium text-slate-300">{INTELLIGENCE_OUTPUT.label}</p>
                  <p className="text-sm text-slate-500">{INTELLIGENCE_OUTPUT.question}</p>
                </Link>
              )}
              <p className="mt-1 text-xs text-slate-600">Presentation / export layer</p>
            </div>
          </div>
        </li>
      </ol>

      <div className="mt-4 border-t border-slate-800 pt-3">
        <p className="text-xs font-medium text-slate-400">{ANALYTICS_RELATED.label}</p>
        <p className="mt-1 text-xs text-slate-500">{ANALYTICS_RELATED.question}</p>
        <p className="mt-1 text-xs text-slate-600">{ANALYTICS_RELATED.detail}</p>
        <Link href={ANALYTICS_RELATED.href} className="mt-2 inline-block text-xs text-sky-400 hover:underline">
          Open Analytics →
        </Link>
      </div>
    </div>
  );
}

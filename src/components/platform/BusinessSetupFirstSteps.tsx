import Link from "next/link";

import type { BusinessSetupFirstStepsProgress } from "@dg/platform-core";

/**
 * Light trial-style first steps — Identify → Profile → Domain / Website / Google.
 * Link-outs only for Domain / Google; no vapor publish or GBP sync claims.
 */
export function BusinessSetupFirstSteps({
  progress,
}: {
  progress: BusinessSetupFirstStepsProgress;
}) {
  const next = progress.steps.find((s) => !s.done);

  return (
    <section
      id="first-steps"
      className="dg-card space-y-4 scroll-mt-24"
      aria-labelledby="first-steps-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
            First steps
          </p>
          <h2 id="first-steps-heading" className="mt-1 text-lg font-semibold text-white">
            {progress.identifyDone
              ? "Identity saved — keep going"
              : "Tell us about the business"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Verify who you are, apply to Business Profile, then connect domain,
            website, and Google when ready. We only mark steps done from fields
            you actually save.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{progress.percent}%</p>
          <p className="text-xs text-slate-500">
            {progress.completed} of {progress.total} signals
          </p>
        </div>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Business setup first steps"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            progress.percent >= 60
              ? "bg-emerald-500"
              : progress.percent > 0
                ? "bg-sky-500"
                : "bg-slate-700"
          }`}
          style={{ width: `${Math.max(progress.percent, progress.percent > 0 ? 8 : 0)}%` }}
        />
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {progress.steps.map((step, index) => (
          <li
            key={step.id}
            className={`rounded-lg border px-3 py-2.5 ${
              step.done
                ? "border-emerald-500/25 bg-emerald-500/5"
                : next?.id === step.id
                  ? "border-sky-500/35 bg-sky-500/5"
                  : "border-slate-800 bg-slate-950/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  step.done
                    ? "bg-emerald-500/20 text-emerald-300"
                    : next?.id === step.id
                      ? "bg-sky-500/20 text-sky-300"
                      : "bg-slate-800 text-slate-500"
                }`}
                aria-hidden
              >
                {step.done ? "✓" : index + 1}
              </span>
              <p
                className={`text-sm font-medium ${
                  step.done ? "text-emerald-100" : "text-slate-200"
                }`}
              >
                {step.label}
              </p>
            </div>
            <p className="mt-1.5 text-xs leading-snug text-slate-500">
              {step.description}
            </p>
            <Link
              href={step.href}
              className={`mt-2 inline-block text-xs font-medium hover:underline ${
                step.done ? "text-emerald-400" : "text-sky-400"
              }`}
            >
              {step.ctaLabel} →
            </Link>
          </li>
        ))}
      </ol>

      {next ? (
        <p className="text-xs text-slate-500">
          Next up:{" "}
          <Link href={next.href} className="text-sky-400 hover:underline">
            {next.label}
          </Link>
          {next.linkOut ? " (opens the surface — no auto-publish)" : null}
        </p>
      ) : (
        <p className="text-xs text-emerald-400/90">
          Core first steps have profile signals — keep refining under Build /
          Connect.
        </p>
      )}
    </section>
  );
}

import Link from "next/link";
import type { AppSetupGuide } from "@dg/platform-core";
import { platformApps } from "@dg/platform-core";

import { PlatformRoadmapBar } from "@/components/platform/PlatformRoadmapBar";

function StepTimeline({ steps }: { steps: AppSetupGuide["steps"] }) {
  return (
    <ol className="relative space-y-0">
      {steps.map((step, index) => (
        <li key={step.id} className="relative flex gap-5 pb-10 last:pb-0">
          {index < steps.length - 1 ? (
            <span
              className="absolute left-[1.125rem] top-10 bottom-0 w-px bg-gradient-to-b from-blue-500/50 to-slate-700/50"
              aria-hidden
            />
          ) : null}
          <span
            className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/10 text-sm font-semibold text-blue-300"
            aria-hidden
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="font-semibold text-white">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{step.description}</p>
            {step.detail ? (
              <p className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                {step.detail}
              </p>
            ) : null}
            {step.code ? (
              <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-700 bg-slate-950/80 p-4 font-mono text-xs leading-relaxed text-emerald-200/90">
                {step.code}
              </pre>
            ) : null}
            {step.href ? (
              <Link
                href={step.href}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-400 hover:text-blue-300"
              >
                {step.hrefLabel ?? "Open"}
                <span aria-hidden>→</span>
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AppSetupGuideView({ guide }: { guide: AppSetupGuide }) {
  const registered = platformApps.get(guide.appId);
  const manifest = registered?.manifest;
  const icon = manifest?.navigation[0]?.icon ?? manifest?.icon ?? "◈";
  const tier = manifest?.tier ?? "core";
  const tierLabel =
    tier === "core"
      ? "Core App"
      : tier === "business"
        ? "Business App"
        : tier === "growth"
          ? "Growth App"
          : "Internal App";

  return (
    <>
      <PlatformRoadmapBar />
      <header className="dg-page-header">
        <Link href="/dashboard/apps" className="text-sm text-blue-400 hover:underline">
          ← Apps & Billing
        </Link>
      </header>

      <main className="dg-page-main">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-[#0c1220] to-blue-950/50 p-8 shadow-lg shadow-blue-950/20">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-wrap items-start gap-5">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-3xl text-blue-400"
                aria-hidden
              >
                {icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-widest text-blue-400/90">
                  Setup guide · {tierLabel}
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {manifest?.name ?? guide.appId}
                </h1>
                <p className="mt-2 text-lg text-slate-300">{guide.headline}</p>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
                  {guide.summary}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {guide.estimatedMinutes ? (
                    <span className="rounded-full border border-slate-600/80 bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
                      ~{guide.estimatedMinutes} min setup
                    </span>
                  ) : null}
                  {registered?.enabled ? (
                    manifest?.navigation[0] ? (
                      <Link
                        href={manifest.navigation[0].href}
                        className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                      >
                        Open app →
                      </Link>
                    ) : null
                  ) : (
                    <span className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-500">
                      Not installed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {guide.prerequisites?.length ? (
            <section className="dg-card">
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
                Before you start
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {guide.prerequisites.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-sm text-slate-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="dg-card">
            <h2 className="font-semibold text-white">Setup steps</h2>
            <p className="mt-1 text-sm text-slate-400">
              Follow in order — each step builds on the last.
            </p>
            <div className="mt-8">
              <StepTimeline steps={guide.steps} />
            </div>
          </section>

          {guide.envVars?.length ? (
            <section className="dg-card border-blue-500/20">
              <h2 className="font-semibold text-white">Environment variables</h2>
              <p className="mt-1 text-sm text-slate-400">
                Add these in Vercel → Settings → Environment Variables (or{" "}
                <code className="text-slate-300">.env.local</code> locally).
              </p>
              <ul className="mt-4 space-y-3">
                {guide.envVars.map((v) => (
                  <li
                    key={v.name}
                    className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-4"
                  >
                    <code className="text-sm font-medium text-blue-300">{v.name}</code>
                    <p className="mt-1 text-sm text-slate-400">{v.description}</p>
                    {v.example ? (
                      <code className="mt-2 block text-xs text-slate-500">{v.example}</code>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {guide.resources?.length ? (
            <section className="dg-card">
              <h2 className="font-semibold text-white">Resources</h2>
              <ul className="mt-3 space-y-2">
                {guide.resources.map((r) => (
                  <li key={r.href}>
                    {r.external ? (
                      <a
                        href={r.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
                      >
                        {r.label}
                        <span className="text-slate-500" aria-hidden>
                          ↗
                        </span>
                      </a>
                    ) : (
                      <Link href={r.href} className="text-sm text-blue-400 hover:underline">
                        {r.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3 pb-8">
            <Link
              href="/dashboard/apps"
              className="rounded-full border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:border-slate-600 hover:text-white"
            >
              All apps
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-slate-800 px-5 py-2.5 text-sm text-white hover:bg-slate-700"
            >
              Back to overview
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

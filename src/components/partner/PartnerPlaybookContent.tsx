import Link from "next/link";
import {
  APPROVED_PARTNER_MESSAGING,
  FOUNDING_RESELLER_ONE_LINER,
  FOUNDING_RESELLER_ROLE,
  GOOD_PROSPECT_SIGNALS,
  PARTNER_BRIEFING_OUTLINE,
  PARTNER_ROLE_PLAY_SCENARIOS,
  RESELLER_MUST_NOT_DO,
  RESELLER_MUST_NOT_CLAIM,
  RESELLER_MAY,
  RESELLER_MODEL,
  RESELLER_NEED_NOT,
  RESELLER_PARTNER_LEVELS,
  RESELLER_PROCESS_FLOW,
} from "@dg/platform-core";

function FlowColumn({
  title,
  steps,
  accent,
}: {
  title: string;
  steps: readonly string[];
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4">
      <p className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>{title}</p>
      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-2 text-sm text-slate-300">
            <span className="shrink-0 font-mono text-xs text-slate-500">{index + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PartnerPlaybookContent() {
  return (
    <div className="max-w-3xl space-y-10">
      <div className="rounded-xl border border-sky-700/30 bg-sky-900/10 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
          Founding Reseller playbook
        </p>
        <p className="mt-2 text-lg font-semibold text-white">{RESELLER_MODEL}</p>
        <p className="mt-2 text-sm text-slate-300">{FOUNDING_RESELLER_ROLE.principle}</p>
        <p className="mt-3 text-sm text-slate-400">
          You are not expected to learn the entire DigitalGate platform. Your network is the
          distribution channel. DigitalGate remains the product, sales, implementation and support
          engine.
        </p>
      </div>

      <section>
        <h2 className="text-base font-semibold text-white">Your one sentence</h2>
        <p className="mt-1 text-sm text-slate-400">
          Memorise this — it is enough to open the door. Ben takes over from there.
        </p>
        <blockquote className="mt-4 rounded-xl border border-emerald-700/30 bg-emerald-900/10 px-5 py-4 text-sm italic text-emerald-100">
          &ldquo;{FOUNDING_RESELLER_ONE_LINER}&rdquo;
        </blockquote>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">What we expect from you</h2>
        <div className="mt-4 space-y-4">
          {FOUNDING_RESELLER_ROLE.expectations.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4"
            >
              <p className="font-medium text-white">{item.title}</p>
              <p className="mt-1 text-sm text-slate-300">{item.body}</p>
              {"example" in item && item.example ? (
                <p className="mt-3 rounded-lg bg-slate-900/60 px-3 py-2 text-sm italic text-slate-400">
                  &ldquo;{item.example}&rdquo;
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">What you don&apos;t need to do</h2>
        <p className="mt-1 text-sm text-slate-400">
          DigitalGate owns the customer experience. This protects the brand and keeps your role
          simple.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {RESELLER_MUST_NOT_DO.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2 text-sm text-slate-300"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">The journey</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <FlowColumn title="You (Reseller)" steps={RESELLER_PROCESS_FLOW.reseller} accent="text-sky-400" />
          <FlowColumn
            title="DigitalGate"
            steps={RESELLER_PROCESS_FLOW.digitalgate}
            accent="text-violet-400"
          />
          <FlowColumn
            title="Then you"
            steps={RESELLER_PROCESS_FLOW.resellerAfter}
            accent="text-emerald-400"
          />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Partner levels</h2>
        <p className="mt-1 text-sm text-slate-400">
          First Founding Resellers start at Level 1 or 2 — not Level 3.
        </p>
        <div className="mt-4 space-y-3">
          {RESELLER_PARTNER_LEVELS.map((level) => (
            <div
              key={level.level}
              className={`rounded-xl border px-5 py-4 ${
                level.startHere
                  ? "border-sky-700/40 bg-sky-900/10"
                  : "border-slate-700/60 bg-slate-800/40"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-white">{level.level}</p>
                {level.startHere ? (
                  <span className="rounded-full bg-sky-600/20 px-2 py-0.5 text-xs text-sky-300">
                    Start here
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-300">{level.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">What makes a good prospect</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-300">
          {GOOD_PROSPECT_SIGNALS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Partner briefing outline</h2>
        <p className="mt-1 text-sm text-slate-400">
          A partner briefing — not sales training. Roughly 70 minutes total.
        </p>
        <div className="mt-4 space-y-2">
          {PARTNER_BRIEFING_OUTLINE.map((block) => (
            <div
              key={block.title}
              className="flex gap-4 rounded-lg border border-slate-700/40 bg-slate-800/30 px-4 py-3"
            >
              <span className="shrink-0 font-mono text-xs text-slate-500">{block.minutes} min</span>
              <div>
                <p className="text-sm font-medium text-white">{block.title}</p>
                <p className="text-sm text-slate-400">{block.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Role play — opening the conversation</h2>
        <div className="mt-4 space-y-3">
          {PARTNER_ROLE_PLAY_SCENARIOS.map((item) => (
            <div
              key={item.scenario}
              className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4"
            >
              <p className="text-sm font-medium text-white">{item.scenario}</p>
              <p className="mt-2 text-sm italic text-slate-400">&ldquo;{item.opener}&rdquo;</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Quick reference — may / need not / must not claim</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-700/30 bg-emerald-900/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-emerald-400">You may</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
              {RESELLER_MAY.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-slate-400">You need not</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
              {RESELLER_NEED_NOT.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-700/30 bg-amber-900/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-amber-400">Must not claim</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
              {RESELLER_MUST_NOT_CLAIM.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Full programme rules:{" "}
          <Link href="/partner/terms" className="text-sky-400 hover:underline">
            Terms
          </Link>
          . Commission detail:{" "}
          <Link href="/partner/resources" className="text-sky-400 hover:underline">
            Resources
          </Link>
          .
        </p>
      </section>

      <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4">
        <p className="text-sm text-slate-300">{APPROVED_PARTNER_MESSAGING.close}</p>
        <p className="mt-3 text-xs text-slate-500">{APPROVED_PARTNER_MESSAGING.disclaimer}</p>
      </section>
    </div>
  );
}

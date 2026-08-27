import Link from "next/link";
import {
  APPROVED_PARTNER_MESSAGING,
  DIGITALGATE_FIVE_PRINCIPLES,
  DIGITALGATE_NOT_JUST,
  DIGITALGATE_POSITIONING,
  EARLY_RESELLER_MARKETS,
  FIRST_30_DAYS,
  FOUNDING_RESELLER_MEETING,
  FOUNDING_RESELLER_ONE_LINER,
  FOUNDING_RESELLER_ROLE,
  FOUNDING_STATUS_BENEFITS,
  IF_YOU_DONT_KNOW,
  INTRODUCTION_SCRIPT,
  QUALITY_OVER_VOLUME,
  RESELLER_DOES_NOT_ONBOARD,
  RESELLER_JOURNEY_LINE,
  RESELLER_MUST_NOT_CLAIM,
  RESELLER_MUST_NOT_DO,
  RESELLER_MAY,
  RESELLER_MODEL,
  RESELLER_NEED_NOT,
  RESELLER_PARTNER_LEVELS,
  SALES_PROCESS_STAGES,
  STRONG_PROSPECT_SIGNALS,
  WEEKLY_EXPECTATIONS,
  WHAT_NOT_TO_PROMISE,
  WHY_ATTRACTIVE_TO_RESELLER,
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
  const resellerStages = SALES_PROCESS_STAGES.filter((s) => s.owner === "Reseller").map(
    (s) => s.title,
  );
  const dgStages = SALES_PROCESS_STAGES.filter((s) => s.owner === "DigitalGate").map(
    (s) => `${s.title}`,
  );

  return (
    <div className="max-w-3xl space-y-10">
      <div className="rounded-xl border border-sky-700/30 bg-sky-900/10 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
          Founding Reseller playbook
        </p>
        <p className="mt-2 text-lg font-semibold text-white">{RESELLER_MODEL}</p>
        <p className="mt-2 text-sm text-slate-300">{FOUNDING_RESELLER_ROLE.principle}</p>
        <p className="mt-3 text-sm text-slate-400">
          {FOUNDING_RESELLER_MEETING.relationshipModel}
        </p>
        <p className="mt-3 rounded-lg bg-slate-950/40 px-4 py-3 text-sm italic text-sky-100">
          &ldquo;{FOUNDING_RESELLER_MEETING.keyMessage}&rdquo;
        </p>
      </div>

      <section>
        <h2 className="text-base font-semibold text-white">What is DigitalGate?</h2>
        <p className="mt-2 text-sm text-slate-300">{DIGITALGATE_POSITIONING}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {DIGITALGATE_FIVE_PRINCIPLES.map((p) => (
            <div
              key={p.name}
              className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-3"
            >
              <p className="text-sm font-semibold text-white">{p.name}</p>
              <p className="mt-1 text-xs text-slate-400">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Not simply: {DIGITALGATE_NOT_JUST.join(" · ")}</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Your one sentence</h2>
        <p className="mt-1 text-sm text-slate-400">
          Memorise this — open the door, then stop. Ben takes over.
        </p>
        <blockquote className="mt-4 rounded-xl border border-emerald-700/30 bg-emerald-900/10 px-5 py-4 text-sm italic text-emerald-100">
          &ldquo;{INTRODUCTION_SCRIPT || FOUNDING_RESELLER_ONE_LINER}&rdquo;
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
        <h2 className="text-base font-semibold text-white">Onboarding is not your job</h2>
        <p className="mt-2 text-sm text-slate-300">
          {RESELLER_DOES_NOT_ONBOARD}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Some partners later become a Certified Delivery Partner — a separate certification,
          training and commercial arrangement. Until then, Ben / DigitalGate delivers setup,
          migration and training.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">What you don&apos;t need to do</h2>
        <p className="mt-1 text-sm text-slate-400">
          DigitalGate owns the customer experience — consistent positioning, pricing, demos and
          support.
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
        <h2 className="text-base font-semibold text-white">What makes a good prospect</h2>
        <p className="mt-1 text-sm text-slate-400">
          Recognise a digital systems problem — you don&apos;t decide the full solution.
        </p>
        <ul className="mt-4 grid gap-1 sm:grid-cols-2">
          {STRONG_PROSPECT_SIGNALS.map((item) => (
            <li key={item} className="text-sm text-slate-300">
              · {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Strong early markets</p>
        <p className="text-sm text-slate-300">{EARLY_RESELLER_MARKETS.join(" · ")}</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">The journey</h2>
        <p className="mt-1 font-mono text-sm text-sky-300">{RESELLER_JOURNEY_LINE}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FlowColumn title="You (Reseller)" steps={resellerStages} accent="text-sky-400" />
          <FlowColumn title="DigitalGate" steps={dgStages} accent="text-violet-400" />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Partner levels</h2>
        <p className="mt-1 text-sm text-slate-400">
          Start at Level 1 or 2. Level 3 is not required initially.
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
        <h2 className="text-base font-semibold text-white">What not to say</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
          {WHAT_NOT_TO_PROMISE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm italic text-slate-400">
          If you don&apos;t know: &ldquo;{IF_YOU_DONT_KNOW}&rdquo;
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Why this is attractive</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
          {WHY_ATTRACTIVE_TO_RESELLER.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-slate-400">{APPROVED_PARTNER_MESSAGING.example}</p>
        <p className="mt-1 text-sm text-slate-400">{APPROVED_PARTNER_MESSAGING.examplePaid}</p>
        <p className="mt-2 text-xs text-slate-500">{APPROVED_PARTNER_MESSAGING.disclaimer}</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Founding Reseller status</h2>
        <p className="mt-1 text-sm text-slate-400">
          You&apos;re helping establish the channel — not just another referral affiliate.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
          {FOUNDING_STATUS_BENEFITS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Initial expectations</h2>
        <p className="mt-1 text-sm text-slate-400">Quality over volume. {QUALITY_OVER_VOLUME}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
          {WEEKLY_EXPECTATIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {FIRST_30_DAYS.map((week) => (
            <div
              key={week.week}
              className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3"
            >
              <p className="text-sm font-semibold text-white">{week.week}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
                {week.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Quick reference</h2>
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
        <p className="text-sm text-slate-300">{FOUNDING_RESELLER_MEETING.closingMessage}</p>
        <p className="mt-3 text-sm font-medium text-white">
          {FOUNDING_RESELLER_MEETING.togetherLine}
        </p>
        <p className="mt-3 text-xs text-slate-500">{APPROVED_PARTNER_MESSAGING.disclaimer}</p>
      </section>
    </div>
  );
}

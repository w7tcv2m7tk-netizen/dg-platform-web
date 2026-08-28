import Link from "next/link";
import {
  COMMISSION_BRIEFING_POINTS,
  DIGITALGATE_FIVE_PRINCIPLES,
  DIGITALGATE_NOT_JUST,
  DIGITALGATE_POSITIONING,
  EARLY_RESELLER_MARKETS,
  FIRST_30_DAYS,
  FOUNDING_RESELLER_MEETING,
  FOUNDING_STATUS_BENEFITS,
  IF_YOU_DONT_KNOW,
  INTRODUCTION_SCRIPT,
  MEETING_AGENDA_SECTIONS,
  MEETING_DISCUSSION_PROMPTS,
  MEETING_OUTCOMES,
  QUALITY_OVER_VOLUME,
  RESELLER_JOURNEY_LINE,
  RESELLER_MUST_NOT_DO,
  RESELLER_PARTNER_LEVELS,
  SALES_PROCESS_STAGES,
  STRONG_PROSPECT_SIGNALS,
  WEEKLY_EXPECTATIONS,
  WHAT_NOT_TO_PROMISE,
  WHY_ATTRACTIVE_TO_RESELLER,
  WHY_RESELLERS_MATTER,
  FOUNDING_RESELLER_ROLE,
  APPROVED_PARTNER_MESSAGING,
  QUALIFYING_COMMISSION_FEES,
} from "@dg/platform-core";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

export function FoundingResellerBriefingRunSheet() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="rounded-xl border border-sky-700/40 bg-sky-900/15 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
          Staff run-sheet · Monday meeting
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{FOUNDING_RESELLER_MEETING.title}</h1>
        <p className="mt-2 text-sm text-slate-300">{FOUNDING_RESELLER_MEETING.purpose}</p>
        <p className="mt-4 rounded-lg bg-slate-950/50 px-4 py-3 text-sm italic text-sky-100">
          &ldquo;{FOUNDING_RESELLER_MEETING.keyMessage}&rdquo;
        </p>
        <p className="mt-3 text-sm font-medium text-white">
          {FOUNDING_RESELLER_MEETING.relationshipModel}
        </p>
        <p className="mt-4 text-sm text-slate-400">
          Partner-facing copy:{" "}
          <Link href="/partner/playbook" className="text-sky-400 hover:underline">
            /partner/playbook
          </Link>
        </p>
      </div>

      <Section id="agenda" title="Agenda">
        <ol className="space-y-2">
          {MEETING_AGENDA_SECTIONS.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-lg border border-slate-700/50 bg-slate-800/40 px-4 py-2 text-sm"
            >
              <span className="shrink-0 font-mono text-xs text-slate-500">{item.minutes}m</span>
              <a href={`#${item.id}`} className="text-slate-200 hover:text-white">
                {item.title}
              </a>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="welcome" title="1. Welcome & why we’re here">
        <p className="text-sm text-slate-300">
          Not signing up two people to sell software — inviting the first partners to introduce
          DigitalGate during the Founding Customer phase. Build a long-term partner network, not a
          traditional sales-agent arrangement.
        </p>
        <p className="text-sm font-medium text-emerald-300">
          {FOUNDING_RESELLER_MEETING.goldenRule}
        </p>
      </Section>

      <Section id="what" title="2. What is DigitalGate?">
        <p className="text-sm text-slate-300">{DIGITALGATE_POSITIONING}</p>
        <div className="grid gap-2 sm:grid-cols-5">
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
        <p className="text-sm text-slate-400">Not simply:</p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {DIGITALGATE_NOT_JUST.map((item) => (
            <li key={item} className="text-sm text-slate-300">
              · {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="why" title="3. Why DigitalGate needs acquisition partners">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          {WHY_RESELLERS_MATTER.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section id="prospects" title="4. What makes a good prospect">
        <p className="text-sm text-slate-400">
          They don’t need every feature — recognise a digital systems problem DigitalGate may solve.
        </p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {STRONG_PROSPECT_SIGNALS.map((item) => (
            <li key={item} className="text-sm text-slate-300">
              · {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Early markets
        </p>
        <p className="text-sm text-slate-300">{EARLY_RESELLER_MARKETS.join(" · ")}</p>
      </Section>

      <Section id="role" title="5. The Founding Acquisition Partner role">
        <div className="space-y-3">
          {FOUNDING_RESELLER_ROLE.expectations.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-4 py-3"
            >
              <p className="font-medium text-white">{item.title}</p>
              <p className="mt-1 text-sm text-slate-300">{item.body}</p>
              {"example" in item && item.example ? (
                <p className="mt-2 text-sm italic text-slate-400">&ldquo;{item.example}&rdquo;</p>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section id="not" title="6. What the acquisition partner does NOT need to do">
        <ul className="grid gap-1 sm:grid-cols-2">
          {RESELLER_MUST_NOT_DO.map((item) => (
            <li key={item} className="text-sm text-slate-300">
              · {item}
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-400">
          Protects consistent positioning, pricing, demos, implementation, support and brand.
        </p>
      </Section>

      <Section id="process" title="7–8. Sales process & journey">
        <p className="font-mono text-sm text-sky-300">{RESELLER_JOURNEY_LINE}</p>
        <ol className="mt-4 space-y-2">
          {SALES_PROCESS_STAGES.map((s) => (
            <li
              key={s.stage}
              className="flex gap-3 rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2 text-sm"
            >
              <span className="shrink-0 font-mono text-xs text-slate-500">{s.stage}</span>
              <div>
                <p className="text-white">
                  {s.title}{" "}
                  <span className="text-xs text-slate-500">({s.owner})</span>
                </p>
                <p className="text-slate-400">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="levels" title="9. Three levels of involvement">
        <div className="space-y-3">
          {RESELLER_PARTNER_LEVELS.map((level) => (
            <div
              key={level.level}
              className={`rounded-lg border px-4 py-3 ${
                level.startHere
                  ? "border-sky-700/40 bg-sky-900/10"
                  : "border-slate-700/50 bg-slate-800/40"
              }`}
            >
              <p className="font-medium text-white">{level.level}</p>
              <p className="mt-1 text-sm text-slate-300">{level.summary}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-amber-200/90">
          Golden rule during Founding: every conversation feeds market, pricing and product feedback
          back into DigitalGate — Ben closes.
        </p>
      </Section>

      <Section id="intro" title="12–13. How to introduce / what not to say">
        <blockquote className="rounded-xl border border-emerald-700/30 bg-emerald-900/10 px-4 py-3 text-sm italic text-emerald-100">
          &ldquo;{INTRODUCTION_SCRIPT}&rdquo;
        </blockquote>
        <p className="text-sm text-slate-400">Then stop. Open the door — don’t sell the whole platform.</p>
        <p className="text-xs font-semibold uppercase text-amber-400">Avoid promising</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {WHAT_NOT_TO_PROMISE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-sm italic text-slate-400">
          If unsure: &ldquo;{IF_YOU_DONT_KNOW}&rdquo;
        </p>
      </Section>

      <Section id="commission" title="14–15. Commission & why it’s attractive">
        <p className="text-sm text-slate-300">{APPROVED_PARTNER_MESSAGING.body}</p>
        <p className="text-sm text-slate-400">{APPROVED_PARTNER_MESSAGING.examplePaid}</p>
        <p className="text-xs font-semibold uppercase text-slate-500">Cover clearly</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {COMMISSION_BRIEFING_POINTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">
          Written Acquisition Partner Agreement is authoritative. Qualifying fees:{" "}
          {QUALIFYING_COMMISSION_FEES.includes.length} include /{" "}
          {QUALIFYING_COMMISSION_FEES.excludes.length} exclude rules in programme lock.
        </p>
        <p className="text-xs font-semibold uppercase text-slate-500">Why attractive</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {WHY_ATTRACTIVE_TO_RESELLER.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section id="founding" title="16–19. Founding status, expectations & target">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {FOUNDING_STATUS_BENEFITS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-sm text-slate-300">Initial weekly rhythm:</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {WEEKLY_EXPECTATIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-sm font-medium text-white">{QUALITY_OVER_VOLUME}</p>
        <p className="text-sm text-slate-400">
          Target: 3–5 highly qualified Founding Acquisition Partners — these two are part of the initial group.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {FIRST_30_DAYS.map((week) => (
            <div
              key={week.week}
              className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-4 py-3"
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
      </Section>

      <Section id="discussion" title="20. Discussion prompts">
        {(
          [
            ["Network", MEETING_DISCUSSION_PROMPTS.network],
            ["Opportunities", MEETING_DISCUSSION_PROMPTS.opportunities],
            ["Strengths", MEETING_DISCUSSION_PROMPTS.strengths],
            ["Expectations", MEETING_DISCUSSION_PROMPTS.expectations],
          ] as const
        ).map(([label, prompts]) => (
          <div key={label}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {prompts.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section id="close" title="22. Final message & Monday outcomes">
        <blockquote className="rounded-xl border border-sky-700/30 bg-sky-900/10 px-4 py-3 text-sm text-sky-100">
          {FOUNDING_RESELLER_MEETING.closingMessage}
        </blockquote>
        <p className="text-sm font-medium text-white">{FOUNDING_RESELLER_MEETING.togetherLine}</p>
        <p className="text-xs font-semibold uppercase text-slate-500">Leave Monday with clarity on</p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {MEETING_OUTCOMES.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-slate-300">
              <span className="text-sky-400">☐</span>
              {item}
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-400">
          Goal isn’t a perfect programme — two motivated Founding Acquisition Partners who understand the model
          and are ready to open their first doors.
        </p>
      </Section>
    </div>
  );
}

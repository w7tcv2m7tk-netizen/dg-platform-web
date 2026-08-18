"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  ACCOUNTING_SYSTEMS,
  AI_HELP_OPTIONS,
  ANALYTICS_SYSTEMS,
  BOOKING_SYSTEMS,
  COMMUNICATION_SYSTEMS,
  CONTACT_SOURCES,
  CONTACT_VOLUMES,
  CORE_APP_OPTIONS,
  CRM_SYSTEMS,
  FOUNDING_ONBOARDING_STEP_LABELS,
  FOUNDING_ONBOARDING_STEPS,
  GROWTH_APP_OPTIONS,
  INDUSTRY_APP_OPTIONS,
  INFRA_APP_OPTIONS,
  MARKETING_SYSTEMS,
  MIGRATE_ENTITY_OPTIONS,
  OUTCOME_OPTIONS,
  PROCESS_OPTIONS,
  WEBSITE_PLATFORMS,
  type FoundingOnboardingAnswers,
  type FoundingOnboardingRecord,
  type FoundingOnboardingStep,
  type FoundingTeamMember,
} from "@dg/platform-core";

const INPUT =
  "w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function toggle(list: string[] | undefined, value: string): string[] {
  const current = list ?? [];
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function CheckGroup({
  options,
  selected,
  onChange,
}: {
  options: readonly string[] | readonly { id: string; label: string }[];
  selected?: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const id = typeof option === "string" ? option : option.id;
        const label = typeof option === "string" ? option : option.label;
        const on = selected?.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(toggle(selected, id))}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              on
                ? "border-sky-400 bg-sky-500/20 text-white"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function FoundingOnboardingWizard({
  initial,
  inviteToken,
}: {
  initial: FoundingOnboardingRecord | null;
  inviteToken?: string;
}) {
  const router = useRouter();
  const [record, setRecord] = useState<FoundingOnboardingRecord | null>(initial);
  const [answers, setAnswers] = useState<FoundingOnboardingAnswers>(
    initial?.answers ?? {},
  );
  const [step, setStep] = useState<FoundingOnboardingStep>(
    initial?.currentStep ?? "business_profile",
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const submitted = Boolean(record?.submittedAt);
  const stepIndex = FOUNDING_ONBOARDING_STEPS.indexOf(step);
  const completed = new Set(record?.completedSteps ?? []);

  const progress = useMemo(() => {
    const total = FOUNDING_ONBOARDING_STEPS.length;
    const done = record?.completedSteps.length ?? 0;
    return { done, total, percent: Math.round((done / total) * 100) };
  }, [record]);

  function patch(partial: FoundingOnboardingAnswers) {
    setAnswers((prev) => ({ ...prev, ...partial }));
  }

  async function save(complete = false) {
    setStatus("saving");
    setMessage("");
    const res = await fetch("/api/v1/founding/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteToken,
        currentStep: step,
        completeStep: complete ? step : undefined,
        answers,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error?.message || "Could not save");
      return null;
    }
    const next = json.data as FoundingOnboardingRecord;
    setRecord(next);
    setAnswers(next.answers);
    setStatus("idle");
    return next;
  }

  async function continueNext() {
    const next = await save(true);
    if (!next) return;
    setStep(next.currentStep);
  }

  async function submit() {
    const saved = await save(true);
    if (!saved) return;
    setStatus("saving");
    const res = await fetch("/api/v1/founding/onboarding/submit", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error?.message || "Submit failed");
      return;
    }
    router.push("/implementation");
  }

  if (submitted) {
    return (
      <main className="dg-page-main">
        <div className="dg-card max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
            Onboarding complete
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Your DigitalGate Setup Plan is ready</h1>
          <p className="mt-2 text-sm text-slate-400">
            We&apos;ve analysed what you shared and created your implementation plan.
          </p>
          <Link
            href="/implementation"
            className="mt-4 inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Open implementation status →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
          Founding Customer onboarding
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Welcome to DigitalGate</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Let&apos;s build your Digital Business Operating Platform. You&apos;ve been
          accepted as a DigitalGate Founding Customer. This configures your
          environment — it is not another application form.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Estimated 20–30 minutes. Save anytime. You do not need to finish in one sitting.
        </p>
      </header>
      <main className="dg-page-main grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <ol className="dg-card space-y-1 text-sm">
          {FOUNDING_ONBOARDING_STEPS.map((id, index) => {
            const done = completed.has(id);
            const active = id === step;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setStep(id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${
                    active
                      ? "bg-sky-500/15 text-white"
                      : done
                        ? "text-emerald-200"
                        : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="w-6 text-xs text-slate-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{FOUNDING_ONBOARDING_STEP_LABELS[id]}</span>
                  {done ? <span className="text-emerald-400">✓</span> : null}
                </button>
              </li>
            );
          })}
          <li className="pt-2 text-xs text-slate-500">
            {progress.done}/{progress.total} complete · {progress.percent}%
          </li>
        </ol>

        <section className="dg-card space-y-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Section {String(stepIndex + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {FOUNDING_ONBOARDING_STEP_LABELS[step]}
            </h2>
          </div>

          {step === "business_profile" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 text-sm text-slate-300">
                Legal business name
                <input
                  className={`${INPUT} mt-1`}
                  value={answers.legalName ?? ""}
                  onChange={(e) => patch({ legalName: e.target.value })}
                />
              </label>
              <label className="text-sm text-slate-300">
                Trading name
                <input
                  className={`${INPUT} mt-1`}
                  value={answers.tradingName ?? ""}
                  onChange={(e) => patch({ tradingName: e.target.value })}
                />
              </label>
              <label className="text-sm text-slate-300">
                ABN
                <input
                  className={`${INPUT} mt-1`}
                  value={answers.abn ?? ""}
                  onChange={(e) => patch({ abn: e.target.value })}
                />
              </label>
              <label className="text-sm text-slate-300">
                Website
                <input
                  className={`${INPUT} mt-1`}
                  value={answers.website ?? ""}
                  onChange={(e) => patch({ website: e.target.value })}
                />
              </label>
              <label className="text-sm text-slate-300">
                Industry
                <input
                  className={`${INPUT} mt-1`}
                  value={answers.industry ?? ""}
                  onChange={(e) => patch({ industry: e.target.value })}
                />
              </label>
              <label className="text-sm text-slate-300">
                Business type
                <input
                  className={`${INPUT} mt-1`}
                  value={answers.businessType ?? ""}
                  onChange={(e) => patch({ businessType: e.target.value })}
                />
              </label>
              <label className="text-sm text-slate-300">
                Number of employees
                <input
                  className={`${INPUT} mt-1`}
                  value={answers.employeeCount ?? ""}
                  onChange={(e) => patch({ employeeCount: e.target.value })}
                />
              </label>
              <label className="sm:col-span-2 text-sm text-slate-300">
                Locations
                <input
                  className={`${INPUT} mt-1`}
                  value={answers.locations ?? ""}
                  onChange={(e) => patch({ locations: e.target.value })}
                />
              </label>
              <label className="text-sm text-slate-300">
                Primary contact
                <input
                  className={`${INPUT} mt-1`}
                  value={answers.primaryContactName ?? ""}
                  onChange={(e) => patch({ primaryContactName: e.target.value })}
                />
              </label>
              <label className="text-sm text-slate-300">
                Primary email
                <input
                  className={`${INPUT} mt-1`}
                  value={answers.primaryContactEmail ?? ""}
                  onChange={(e) => patch({ primaryContactEmail: e.target.value })}
                />
              </label>
              <label className="sm:col-span-2 text-sm text-slate-300">
                What does the business do, and who do you serve?
                <textarea
                  className={`${INPUT} mt-1 min-h-[5rem]`}
                  value={`${answers.description ?? ""}${answers.serve ? `\n\n${answers.serve}` : ""}`}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </label>
              <label className="sm:col-span-2 text-sm text-slate-300">
                Main reason you&apos;re implementing DigitalGate
                <textarea
                  className={`${INPUT} mt-1 min-h-[4rem]`}
                  value={answers.objective ?? ""}
                  onChange={(e) => patch({ objective: e.target.value })}
                />
              </label>
            </div>
          ) : null}

          {step === "people_team" ? (
            <TeamEditor
              team={answers.team ?? []}
              onChange={(team) => patch({ team })}
            />
          ) : null}

          {step === "customers_contacts" ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-300">Where does customer/contact data live?</p>
                <div className="mt-2">
                  <CheckGroup
                    options={CONTACT_SOURCES}
                    selected={answers.contactSource ? [answers.contactSource] : []}
                    onChange={(next) => patch({ contactSource: next[next.length - 1] })}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-300">Approximate number of contacts</p>
                <div className="mt-2">
                  <CheckGroup
                    options={CONTACT_VOLUMES}
                    selected={answers.contactVolume ? [answers.contactVolume] : []}
                    onChange={(next) => patch({ contactVolume: next[next.length - 1] })}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-300">Migrate existing contacts?</p>
                <div className="mt-2 flex gap-2">
                  {(["yes", "no", "unsure"] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => patch({ migrateContacts: id })}
                      className={`rounded-full border px-3 py-1.5 text-sm capitalize ${
                        answers.migrateContacts === id
                          ? "border-sky-400 bg-sky-500/20 text-white"
                          : "border-slate-700 text-slate-300"
                      }`}
                    >
                      {id === "unsure" ? "Not sure" : id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === "current_systems" ? (
            <div className="space-y-4">
              <FieldSelect
                label="Website"
                value={answers.websitePlatform}
                options={WEBSITE_PLATFORMS}
                onChange={(websitePlatform) => patch({ websitePlatform })}
              />
              <FieldSelect
                label="CRM"
                value={answers.crmSystem}
                options={CRM_SYSTEMS}
                onChange={(crmSystem) => patch({ crmSystem })}
              />
              <FieldSelect
                label="Accounting"
                value={answers.accounting}
                options={ACCOUNTING_SYSTEMS}
                onChange={(accounting) => patch({ accounting })}
              />
              <div>
                <p className="text-sm text-slate-300">Communication</p>
                <div className="mt-2">
                  <CheckGroup
                    options={COMMUNICATION_SYSTEMS}
                    selected={answers.communication}
                    onChange={(communication) => patch({ communication })}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-300">Marketing</p>
                <div className="mt-2">
                  <CheckGroup
                    options={MARKETING_SYSTEMS}
                    selected={answers.marketing}
                    onChange={(marketing) => patch({ marketing })}
                  />
                </div>
              </div>
              <FieldSelect
                label="Bookings"
                value={answers.bookings}
                options={BOOKING_SYSTEMS}
                onChange={(bookings) => patch({ bookings })}
              />
              <div>
                <p className="text-sm text-slate-300">Analytics</p>
                <div className="mt-2">
                  <CheckGroup
                    options={ANALYTICS_SYSTEMS}
                    selected={answers.analytics}
                    onChange={(analytics) => patch({ analytics })}
                  />
                </div>
              </div>
              <label className="block text-sm text-slate-300">
                Other systems
                <input
                  className={`${INPUT} mt-1`}
                  value={answers.otherSystems ?? ""}
                  onChange={(e) => patch({ otherSystems: e.target.value })}
                />
              </label>
            </div>
          ) : null}

          {step === "digital_presence" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["googleBusiness", "Google Business Profile"],
                  ["facebook", "Facebook"],
                  ["instagram", "Instagram"],
                  ["linkedin", "LinkedIn"],
                  ["youtube", "YouTube"],
                  ["directories", "Industry directories"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-sm text-slate-300">
                  {label}
                  <input
                    className={`${INPUT} mt-1`}
                    value={(answers[key] as string | undefined) ?? ""}
                    onChange={(e) => patch({ [key]: e.target.value })}
                  />
                </label>
              ))}
              <p className="sm:col-span-2 text-sm text-slate-500">
                After go-live, DigitalGate can run a Business Audit against this footprint so
                we compare what you told us with what we discover.
              </p>
            </div>
          ) : null}

          {step === "apps" ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-white">Core</p>
                <CheckGroup
                  options={CORE_APP_OPTIONS}
                  selected={answers.coreApps}
                  onChange={(coreApps) => patch({ coreApps })}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Infrastructure</p>
                <CheckGroup
                  options={INFRA_APP_OPTIONS}
                  selected={answers.infraApps}
                  onChange={(infraApps) => patch({ infraApps })}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Industry</p>
                <CheckGroup
                  options={INDUSTRY_APP_OPTIONS}
                  selected={answers.industryApps}
                  onChange={(industryApps) => patch({ industryApps })}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Growth</p>
                <CheckGroup
                  options={GROWTH_APP_OPTIONS}
                  selected={answers.growthApps}
                  onChange={(growthApps) => patch({ growthApps })}
                />
              </div>
              <p className="text-sm text-slate-500">
                Choose priorities — DigitalGate recommends the initial configuration. You do
                not configure everything now.
              </p>
            </div>
          ) : null}

          {step === "goals" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Three most important outcomes (pick up to three)
              </p>
              <CheckGroup
                options={OUTCOME_OPTIONS}
                selected={answers.outcomes}
                onChange={(outcomes) => patch({ outcomes: outcomes.slice(0, 3) })}
              />
              <label className="block text-sm text-slate-300">
                What would make DigitalGate a success after 90 days?
                <textarea
                  className={`${INPUT} mt-1 min-h-[5rem]`}
                  value={answers.success90Days ?? ""}
                  onChange={(e) => patch({ success90Days: e.target.value })}
                />
              </label>
            </div>
          ) : null}

          {step === "processes" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">Important processes you run today</p>
              <CheckGroup
                options={PROCESS_OPTIONS}
                selected={answers.processes}
                onChange={(processes) => patch({ processes })}
              />
              <label className="block text-sm text-slate-300">
                Which currently require the most manual work?
                <textarea
                  className={`${INPUT} mt-1 min-h-[4rem]`}
                  value={answers.manualProcesses ?? ""}
                  onChange={(e) => patch({ manualProcesses: e.target.value })}
                />
              </label>
            </div>
          ) : null}

          {step === "ai_automation" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">Where would you most like AI to help?</p>
              <CheckGroup
                options={AI_HELP_OPTIONS}
                selected={answers.aiHelp}
                onChange={(aiHelp) => patch({ aiHelp })}
              />
              <label className="block text-sm text-slate-300">
                What repetitive tasks would you eliminate if you could?
                <textarea
                  className={`${INPUT} mt-1 min-h-[4rem]`}
                  value={answers.repetitiveTasks ?? ""}
                  onChange={(e) => patch({ repetitiveTasks: e.target.value })}
                />
              </label>
            </div>
          ) : null}

          {step === "data_migration" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">What is coming into DigitalGate?</p>
              <CheckGroup
                options={MIGRATE_ENTITY_OPTIONS}
                selected={answers.migrateEntities}
                onChange={(migrateEntities) => patch({ migrateEntities })}
              />
              <label className="block text-sm text-slate-300">
                Where is that data currently stored?
                <input
                  className={`${INPUT} mt-1`}
                  value={answers.dataLocation ?? ""}
                  onChange={(e) => patch({ dataLocation: e.target.value })}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Notes
                <textarea
                  className={`${INPUT} mt-1 min-h-[4rem]`}
                  value={answers.migrationNotes ?? ""}
                  onChange={(e) => patch({ migrationNotes: e.target.value })}
                />
              </label>
            </div>
          ) : null}

          {step === "integrations" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Connect accounts securely. Do not paste passwords here.
              </p>
              {(
                [
                  ["connectGoogle", "Google (Business Profile, Search Console, Analytics)"],
                  ["connectMeta", "Meta (Facebook, Instagram, Ads)"],
                  ["connectMicrosoft", "Microsoft 365"],
                  ["connectXero", "Xero / MYOB"],
                  ["connectWordpress", "WordPress"],
                  ["connectShopify", "Shopify"],
                  ["connectStripe", "Stripe"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={Boolean(answers[key])}
                    onChange={(e) => patch({ [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
              <Link
                href="/dashboard/settings/connectors"
                className="inline-block text-sm text-sky-400 hover:underline"
              >
                Open Connectors (OAuth / keys) →
              </Link>
            </div>
          ) : null}

          {step === "go_live" ? (
            <div className="space-y-3 text-sm text-slate-300">
              <p className="text-white font-medium">Your DigitalGate implementation</p>
              <p>Business: {answers.legalName || answers.tradingName || "—"}</p>
              <p>Core: {(answers.coreApps ?? []).join(" · ") || "CRM · Contacts · Opportunities"}</p>
              <p>
                Apps:{" "}
                {[...(answers.growthApps ?? []), ...(answers.industryApps ?? [])].join(" · ") ||
                  "To be recommended"}
              </p>
              <p>
                Primary goals: {(answers.outcomes ?? []).slice(0, 3).join(" · ") || "—"}
              </p>
              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-slate-400">
                <p>Week 1 — Foundation: organisation, users, Core.</p>
                <p>Week 2 — Connections: website and key systems.</p>
                <p>Week 3 — Intelligence: Twin, Goals, reporting.</p>
                <p>Week 4 — Automation: first priority workflows.</p>
              </div>
              <label className="block">
                Go-live target
                <input
                  type="date"
                  className={`${INPUT} mt-1`}
                  value={answers.goLiveDate ?? ""}
                  onChange={(e) => patch({ goLiveDate: e.target.value })}
                />
              </label>
            </div>
          ) : null}

          {message ? <p className="text-sm text-amber-300">{message}</p> : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => void save(false)}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200"
              disabled={status === "saving"}
            >
              Save &amp; exit later
            </button>
            {step === "go_live" ? (
              <button
                type="button"
                onClick={() => void submit()}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                disabled={status === "saving"}
              >
                Submit &amp; begin implementation →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void continueNext()}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                disabled={status === "saving"}
              >
                Save &amp; continue
              </button>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <select
        className={`${INPUT} mt-1`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TeamEditor({
  team,
  onChange,
}: {
  team: FoundingTeamMember[];
  onChange: (team: FoundingTeamMember[]) => void;
}) {
  function update(index: number, patch: Partial<FoundingTeamMember>) {
    onChange(team.map((member, i) => (i === index ? { ...member, ...patch } : member)));
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Users and permissions will be invited from this list. Restricted access can be
        tightened later.
      </p>
      {team.map((member, index) => (
        <div key={index} className="grid gap-2 rounded-lg border border-slate-800 p-3 sm:grid-cols-2">
          <input
            className={INPUT}
            placeholder="Name"
            value={member.name}
            onChange={(e) => update(index, { name: e.target.value })}
          />
          <input
            className={INPUT}
            placeholder="Email"
            value={member.email}
            onChange={(e) => update(index, { email: e.target.value })}
          />
          <input
            className={INPUT}
            placeholder="Role"
            value={member.role}
            onChange={(e) => update(index, { role: e.target.value })}
          />
          <select
            className={INPUT}
            value={member.access}
            onChange={(e) =>
              update(index, { access: e.target.value as FoundingTeamMember["access"] })
            }
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>
      ))}
      <button
        type="button"
        className="text-sm text-sky-400 hover:underline"
        onClick={() =>
          onChange([...team, { name: "", email: "", role: "", access: "member" }])
        }
      >
        + Add team member
      </button>
    </div>
  );
}

import Link from "next/link";
import {
  CERTIFIED_SPECIALIST_TRACKS,
  CUSTOMER_ONBOARDING_STAGES,
  DELIVERY_LAYERS,
  FOUNDING_IMPLEMENTATION_TARGET,
  IMPLEMENTATION_CERT_MODULES,
  IMPLEMENTATION_CERTIFICATION_NAME,
  IMPLEMENTATION_FEE_BANDS,
  IMPLEMENTATION_FEE_DISCLAIMER,
  IMPLEMENTATION_PARTNER_PROPOSITION,
  IMPLEMENTATION_SCOPE,
  PARTNER_ECOSYSTEM_LAYERS,
  PARTNER_ECOSYSTEM_PHASES,
  PARTNER_ECOSYSTEM_POSITIONING,
  PARTNER_ECOSYSTEM_ROLES,
  RESELLER_DOES_NOT_ONBOARD,
} from "@dg/platform-core";

export function PartnerEcosystemOverview() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="rounded-xl border border-sky-700/40 bg-sky-900/15 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
          Partner Ecosystem
        </p>
        <p className="mt-2 text-lg font-semibold text-white">{PARTNER_ECOSYSTEM_POSITIONING}</p>
        <p className="mt-3 text-sm text-slate-400">{RESELLER_DOES_NOT_ONBOARD}</p>
      </div>

      <section>
        <h2 className="text-base font-semibold text-white">Four partner types</h2>
        <p className="mt-1 text-sm text-slate-400">
          Skillsets and economics are different — do not collapse these into one generic reseller.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Primary role</th>
                <th className="px-3 py-2">Acquire</th>
                <th className="px-3 py-2">Onboard</th>
                <th className="px-3 py-2">Technical</th>
                <th className="px-3 py-2">Economics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {PARTNER_ECOSYSTEM_ROLES.map((row) => (
                <tr key={row.type} className="text-slate-300">
                  <td className="px-3 py-2 font-medium text-white">{row.label}</td>
                  <td className="px-3 py-2">{row.primaryRole}</td>
                  <td className="px-3 py-2">{row.acquisition ? "Yes" : "Optional"}</td>
                  <td className="px-3 py-2">
                    {row.onboarding === true
                      ? "Yes"
                      : row.onboarding === "optional"
                        ? "Optional"
                        : "No"}
                  </td>
                  <td className="px-3 py-2">
                    {row.technical === true
                      ? "Yes"
                      : row.technical === "some" || row.technical === "optional"
                        ? String(row.technical)
                        : "No"}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{row.economics}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Ecosystem layers</h2>
        <ol className="mt-4 space-y-2">
          {PARTNER_ECOSYSTEM_LAYERS.map((layer, i) => (
            <li
              key={layer.id}
              className="flex gap-3 rounded-lg border border-slate-700/50 bg-slate-800/40 px-4 py-3"
            >
              <span className="font-mono text-xs text-slate-500">{i + 1}</span>
              <div>
                <p className="text-sm font-medium text-white">
                  {layer.title} · {layer.role}
                </p>
                <p className="text-sm text-slate-400">{layer.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Three delivery layers</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {DELIVERY_LAYERS.map((layer) => (
            <div
              key={layer.owner}
              className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-4"
            >
              <p className="text-sm font-semibold text-white">{layer.owner}</p>
              <p className="mt-1 text-sm text-slate-400">{layer.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Build sequence</h2>
        <div className="mt-4 space-y-3">
          {PARTNER_ECOSYSTEM_PHASES.map((p) => (
            <div
              key={p.phase}
              className={`rounded-xl border px-5 py-4 ${
                p.now ? "border-sky-700/40 bg-sky-900/10" : "border-slate-700/60 bg-slate-800/40"
              }`}
            >
              <p className="text-sm font-medium text-white">
                Phase {p.phase} — {p.title}
                {p.now ? (
                  <span className="ml-2 rounded-full bg-sky-600/20 px-2 py-0.5 text-xs text-sky-300">
                    Now
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-slate-300">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-400">
          Next recruitment: 2 Founding Resellers → {FOUNDING_IMPLEMENTATION_TARGET} Founding
          Implementation Partners → then document and certify the model.
        </p>
      </section>

      <p className="text-sm text-slate-400">
        <Link href="/command/partners/implementation" className="text-sky-400 hover:underline">
          Implementation Partner programme →
        </Link>{" "}
        ·{" "}
        <Link href="/command/partners/onboarding" className="text-sky-400 hover:underline">
          Customer onboarding workflow →
        </Link>
      </p>
    </div>
  );
}

export function ImplementationPartnerProgramme() {
  const scopeBlocks = [
    ["Business setup", IMPLEMENTATION_SCOPE.businessSetup],
    ["Data migration", IMPLEMENTATION_SCOPE.dataMigration],
    ["CRM setup", IMPLEMENTATION_SCOPE.crmSetup],
    ["Website", IMPLEMENTATION_SCOPE.website],
    ["Integrations", IMPLEMENTATION_SCOPE.integrations],
    ["Automation", IMPLEMENTATION_SCOPE.automation],
    ["AI", IMPLEMENTATION_SCOPE.ai],
    ["Training", IMPLEMENTATION_SCOPE.training],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="rounded-xl border border-violet-700/40 bg-violet-900/10 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">
          Phase 2 · Founding Implementation
        </p>
        <p className="mt-2 text-lg font-semibold text-white">{IMPLEMENTATION_PARTNER_PROPOSITION}</p>
        <p className="mt-2 text-sm text-slate-400">
          Recruit {FOUNDING_IMPLEMENTATION_TARGET} excellent people — not 20. Certification is
          meaningful: Certified → Approved → Active.
        </p>
      </div>

      <section>
        <h2 className="text-base font-semibold text-white">Scope</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {scopeBlocks.map(([title, items]) => (
            <div
              key={title}
              className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3"
            >
              <p className="text-sm font-semibold text-white">{title}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-slate-300">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">{IMPLEMENTATION_CERTIFICATION_NAME}</h2>
        <ol className="mt-4 grid gap-1 sm:grid-cols-2">
          {IMPLEMENTATION_CERT_MODULES.map((mod, i) => (
            <li key={mod} className="flex gap-2 text-sm text-slate-300">
              <span className="font-mono text-xs text-slate-500">{i + 1}.</span>
              {mod}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Implementation fees (illustrative)</h2>
        <p className="mt-1 text-sm text-slate-400">
          Separate from reseller commission. Customer can self-implement or pay for implementation.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {IMPLEMENTATION_FEE_BANDS.map((band) => (
            <div
              key={band.name}
              className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-4"
            >
              <p className="text-sm font-semibold text-white">{band.name}</p>
              <p className="mt-1 text-lg text-emerald-300">{band.range}</p>
              <p className="mt-1 text-xs text-slate-400">{band.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">{IMPLEMENTATION_FEE_DISCLAIMER}</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Later: specialist certifications</h2>
        <div className="mt-4 space-y-2">
          {CERTIFIED_SPECIALIST_TRACKS.map((track) => (
            <div
              key={track.id}
              className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3"
            >
              <p className="text-sm font-medium text-white">{track.name}</p>
              <p className="text-sm text-slate-400">{track.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function CustomerOnboardingWorkflow() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <p className="text-sm text-slate-400">
        Standard DigitalGate onboarding. Resellers sit at the start of acquisition — they do not run
        this workflow unless they are also a Certified Implementation Partner.
      </p>
      <ol className="space-y-3">
        {CUSTOMER_ONBOARDING_STAGES.map((stage) => (
          <li
            key={stage.id}
            className="flex gap-4 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3"
          >
            <span className="shrink-0 font-mono text-sm text-sky-400">{stage.n}</span>
            <div>
              <p className="font-medium text-white">{stage.title}</p>
              <p className="text-sm text-slate-400">{stage.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

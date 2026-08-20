import Link from "next/link";
import {
  BUSINESS_BRAIN_ONBOARDING,
  CERTIFIED_SPECIALIST_TRACKS,
  COMMERCIAL_ENGINE,
  CUSTOMER_ONBOARDING_STAGES,
  DELIVERY_CAPACITY_PHASES,
  DELIVERY_CHAIN,
  DELIVERY_CHAIN_AVOID,
  DELIVERY_MODEL_ACTIVE_NOW,
  DELIVERY_MODEL_POSITIONING,
  DIGITALGATE_OWNS,
  DIGITALGATE_TEAM_STRUCTURE,
  IMPLEMENTATION_CERT_MODULES,
  IMPLEMENTATION_CERTIFICATION_NAME,
  IMPLEMENTATION_FEE_BANDS,
  IMPLEMENTATION_FEE_DISCLAIMER,
  IMPLEMENTATION_LEAD_FIRST_MANDATE,
  IMPLEMENTATION_PACKAGES,
  IMPLEMENTATION_PACKAGES_NOTE,
  IMPLEMENTATION_PARTNER_PROPOSITION,
  IMPLEMENTATION_SCOPE,
  IMPLEMENTATION_SOP_STAGES,
  PARTNER_DELIVERY_OWNS,
  PARTNER_ECOSYSTEM_LAYERS,
  PARTNER_ECOSYSTEM_PHASES,
  PARTNER_ECOSYSTEM_POSITIONING,
  PARTNER_ECOSYSTEM_ROLES,
  RESELLER_DOES_NOT_ONBOARD,
  FOUNDING_IMPLEMENTATION_TARGET,
  DELIVERY_LAYERS,
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
        </Link>{" "}
        ·{" "}
        <Link href="/command/partners/delivery" className="text-sky-400 hover:underline">
          Delivery operating model →
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
        <p className="mt-3 rounded-lg border border-amber-700/40 bg-amber-900/15 px-4 py-3 text-sm text-amber-100/90">
          {IMPLEMENTATION_LEAD_FIRST_MANDATE}
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
        <h2 className="text-base font-semibold text-white">Implementation packages (internal)</h2>
        <p className="mt-1 text-sm text-slate-400">{IMPLEMENTATION_PACKAGES_NOTE}</p>
        <div className="mt-4 space-y-3">
          {IMPLEMENTATION_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-4"
            >
              <p className="text-sm font-semibold text-white">{pkg.name}</p>
              <p className="text-xs text-slate-500">{pkg.audience}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-slate-300">
                {pkg.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
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
        Standard 15-stage DigitalGate implementation SOP. Resellers sit at the start of acquisition —
        they do not run this workflow unless they are also a Certified Implementation Partner.
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
      <p className="text-sm text-slate-400">
        <Link href="/command/partners/delivery" className="text-sky-400 hover:underline">
          Full delivery operating model →
        </Link>
      </p>
    </div>
  );
}

export function DeliveryOperatingModel() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/10 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
          Delivery operating model
        </p>
        <p className="mt-2 text-lg font-semibold text-white">{DELIVERY_MODEL_POSITIONING}</p>
        <p className="mt-3 text-sm text-emerald-100/80">{DELIVERY_MODEL_ACTIVE_NOW}</p>
      </div>

      <section>
        <h2 className="text-base font-semibold text-white">Commercial engine</h2>
        <ol className="mt-4 space-y-2">
          {COMMERCIAL_ENGINE.map((step, i) => (
            <li
              key={step.stage}
              className="flex gap-3 rounded-lg border border-slate-700/50 bg-slate-800/40 px-4 py-3"
            >
              <span className="font-mono text-xs text-slate-500">{i + 1}</span>
              <div>
                <p className="text-sm font-medium text-white">{step.stage}</p>
                <p className="text-sm text-slate-400">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Team structure</h2>
        <div className="mt-4 space-y-3">
          {DIGITALGATE_TEAM_STRUCTURE.map((member) => (
            <div
              key={member.role}
              className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-4"
            >
              <p className="text-sm font-semibold text-white">{member.role}</p>
              {"internalName" in member ? (
                <p className="mt-1 text-xs text-slate-500">
                  Internal: {member.internalName} · Public: {member.publicName}
                </p>
              ) : null}
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-slate-300">
                {member.responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Delivery chain</h2>
        <p className="mt-2 font-mono text-sm text-emerald-300">{DELIVERY_CHAIN}</p>
        <p className="mt-2 text-sm text-slate-500">Avoid: {DELIVERY_CHAIN_AVOID}</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Head of Implementation — first mandate</h2>
        <p className="mt-2 rounded-lg border border-violet-700/40 bg-violet-900/10 px-4 py-3 text-sm text-slate-200">
          {IMPLEMENTATION_LEAD_FIRST_MANDATE}
        </p>
        <ol className="mt-4 space-y-2">
          {IMPLEMENTATION_SOP_STAGES.map((stage) => (
            <li
              key={stage.n}
              className="flex gap-3 rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-2.5"
            >
              <span className="font-mono text-xs text-sky-400">{stage.n}</span>
              <div>
                <p className="text-sm font-medium text-white">{stage.title}</p>
                <p className="text-xs text-slate-400">{stage.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Implementation packages</h2>
        <p className="mt-1 text-sm text-slate-400">{IMPLEMENTATION_PACKAGES_NOTE}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {IMPLEMENTATION_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-4"
            >
              <p className="text-sm font-semibold text-white">{pkg.name}</p>
              <p className="mt-1 text-xs text-slate-500">{pkg.audience}</p>
              <ul className="mt-3 list-disc space-y-0.5 pl-4 text-xs text-slate-300">
                {pkg.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Business Brain during onboarding</h2>
        <p className="mt-1 text-sm text-slate-400">{BUSINESS_BRAIN_ONBOARDING.proposition}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {BUSINESS_BRAIN_ONBOARDING.dimensions.map((dim) => (
            <div
              key={dim.name}
              className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3"
            >
              <p className="text-sm font-semibold text-white">{dim.name}</p>
              <p className="mt-1 text-xs text-slate-400">{dim.items.join(" · ")}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Surfaces: {BUSINESS_BRAIN_ONBOARDING.surfaces.join(" → ")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Scaling delivery capacity</h2>
        <div className="mt-4 space-y-2">
          {DELIVERY_CAPACITY_PHASES.map((phase) => (
            <div
              key={phase.scale}
              className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3"
            >
              <p className="text-sm font-medium text-white">{phase.scale}</p>
              <p className="text-sm text-slate-400">{phase.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Relationship ownership</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-sky-700/40 bg-sky-900/10 px-4 py-4">
            <p className="text-sm font-semibold text-white">DigitalGate owns</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-slate-300">
              {DIGITALGATE_OWNS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-violet-700/40 bg-violet-900/10 px-4 py-4">
            <p className="text-sm font-semibold text-white">Partner delivery owns</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-slate-300">
              {PARTNER_DELIVERY_OWNS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <p className="text-sm text-slate-400">
        <Link href="/command/partners/onboarding" className="text-sky-400 hover:underline">
          Customer onboarding SOP →
        </Link>{" "}
        ·{" "}
        <Link href="/command/partners/implementation" className="text-sky-400 hover:underline">
          Implementation Partner programme →
        </Link>
      </p>
    </div>
  );
}

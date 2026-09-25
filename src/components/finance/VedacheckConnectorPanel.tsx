import Link from "next/link";

export function VedacheckConnectorPanel() {
  return (
    <section className="dg-card space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Specialist integration</p>
        <h2 className="mt-1 font-semibold text-white">Vedacheck</h2>
        <p className="mt-1 text-sm text-slate-400">
          Credit-check and verification capability for authorised mortgage and finance broking workflows. Sensitive report data stays within governed Finance workflows rather than general CRM records.
        </p>
      </div>
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-4">
        <p className="font-medium text-white">Vedacheck integration — Scale</p>
        <p className="mt-1 text-sm text-slate-400">
          Connect approved Vedacheck access to DigitalGate Finance for governed credit-check, report and verification workflows.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link href="/dashboard/settings/billing" className="inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">Scale specialist access</Link>
          <span className="text-xs text-slate-500">Connection setup becomes available once approved provider integration credentials and documentation are supplied.</span>
        </div>
      </div>
    </section>
  );
}

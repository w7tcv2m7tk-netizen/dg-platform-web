import Link from "next/link";

export function IllionBankStatementsPanel() {
  return (
    <section className="dg-card space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Specialist integration</p>
        <h2 className="mt-1 font-semibold text-white">illion BankStatements</h2>
        <p className="mt-1 text-sm text-slate-400">
          Customer-authorised bank statement and transaction data for mortgage and finance broking workflows. DigitalGate consumes authorised outputs; customer online-banking credentials are never collected by DigitalGate.
        </p>
      </div>
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-4">
        <p className="font-medium text-white">illion BankStatements integration — Scale</p>
        <p className="mt-1 text-sm text-slate-400">
          Bring statement, transaction, income and expense intelligence into the Finance workspace and Business Brain without creating a second finance CRM.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link href="/dashboard/settings/billing" className="inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">Scale specialist access</Link>
          <span className="text-xs text-slate-500">Connection setup becomes available when partner API credentials and integration documentation are issued.</span>
        </div>
      </div>
    </section>
  );
}

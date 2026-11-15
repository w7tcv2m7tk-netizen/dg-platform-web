import Link from "next/link";

/** Shown when the org is not enrolled in Real Estate beta. */
export function ReBetaGateMessage() {
  return (
    <div className="dg-card border border-amber-500/30 bg-amber-500/5">
      <h2 className="text-lg font-semibold text-white">Not enabled for this organisation</h2>
      <p className="mt-2 text-sm text-slate-300">
        Real Estate requires organisation-specific activation. Contact DigitalGate to review the selected Industry App for this workspace.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/dashboard/business"
          className="text-sm text-sky-400 hover:underline"
        >
          Business Profile →
        </Link>
        <Link
          href="/dashboard/apps"
          className="text-sm text-sky-400 hover:underline"
        >
          Apps & Plan →
        </Link>
      </div>
    </div>
  );
}

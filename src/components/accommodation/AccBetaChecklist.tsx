import Link from "next/link";

/** Shown when the org is not enrolled in Accommodation beta. */
export function AccBetaGateMessage() {
  return (
    <div className="dg-card border border-amber-500/30 bg-amber-500/5">
      <h2 className="text-lg font-semibold text-white">Accommodation beta</h2>
      <p className="mt-2 text-sm text-slate-300">
        This organisation isn’t enrolled in the Accommodation beta yet. Ask DigitalGate to use{" "}
        <strong className="font-medium text-amber-100">Enable Acc beta</strong> on Command Centre →
        Clients (installs the app + sets{" "}
        <code className="text-amber-200">acc.beta</code>), or create a new business with the
        Accommodation template. Flags-only may hide the app until the install runs.
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

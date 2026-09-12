import Link from "next/link";

/** Shared operator note for Command Centre beta constraints. */
export function CommandHonestyBanner({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-3 text-xs text-slate-400">
        Current operating limits: Growth MRR remains $0 until attribution is live · Expansion uses
        catalogue list prices · Call today is a ranked worklist, not an autonomous SDR · Success
        Score improves as customer data matures.{" "}
        <Link
          href="/command/growth-engine"
          className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
        >
          Growth Engine
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm text-amber-50">
      <p className="font-medium text-white">Current operating limits</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/85">
        <li>
          <strong className="font-medium text-white">Growth MRR won / forecast</strong> stays $0
          until Stripe attribution is live. Commerce MRR on Revenue remains a separate measure.
        </li>
        <li>
          <strong className="font-medium text-white">Expansion</strong> uses the app catalogue and
          list prices rather than inferred Stripe revenue.
        </li>
        <li>
          <strong className="font-medium text-white">Sales Assistant</strong> is the ranked Call
          today worklist, not an autonomous AI SDR.
        </li>
        <li>
          <strong className="font-medium text-white">Support and audit</strong> remain in their
          dedicated operational surfaces rather than duplicate Command modules.
        </li>
        <li>
          <strong className="font-medium text-white">Success Score™ / Twin</strong> becomes more
          informative as customer data accumulates; missing data is not inferred.
        </li>
      </ul>
    </div>
  );
}

import Link from "next/link";

export function OperatorDataUnavailable({
  label,
  showHealthLink = true,
}: {
  label: string;
  showHealthLink?: boolean;
}) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
      <p>Live {label} data is temporarily unavailable.</p>
      <p className="mt-1 text-xs text-amber-100/70">
        {showHealthLink
          ? "The operator data service could not load this view. Check platform alerts or retry shortly."
          : "The operator data service could not load this view. Retry shortly or use system diagnostics if the issue persists."}
      </p>
      {showHealthLink ? (
        <Link
          href="/command/platform-health"
          className="mt-2 inline-flex min-h-11 items-center text-sky-300 hover:underline"
        >
          Open Platform Alerts →
        </Link>
      ) : null}
    </div>
  );
}

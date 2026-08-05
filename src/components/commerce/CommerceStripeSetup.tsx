import { getStripeSetupStatus } from "@dg/platform-core";

function CheckRow({
  done,
  label,
  hint,
}: {
  done: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <li className="flex gap-2 text-sm">
      <span className={done ? "text-emerald-400" : "text-amber-400"}>
        {done ? "✓" : "○"}
      </span>
      <div>
        <span className={done ? "text-slate-200" : "text-slate-300"}>{label}</span>
        {hint && !done ? (
          <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    </li>
  );
}

export function CommerceStripeSetup() {
  const status = getStripeSetupStatus();

  return (
    <div
      className={`dg-card ${status.ok ? "border-emerald-500/20" : "border-amber-500/30"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Stripe setup</h2>
          <p className="mt-1 text-sm text-slate-400">
            Mode:{" "}
            <span className="font-mono text-slate-300">
              {status.mode === "unset" ? "not configured" : status.mode}
            </span>
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            status.ok
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-300"
          }`}
        >
          {status.ok ? "Ready" : "Action required"}
        </span>
      </div>

      <ul className="mt-4 space-y-2">
        {status.checklist.map((item) => (
          <CheckRow key={item.id} done={item.done} label={item.label} hint={item.hint} />
        ))}
      </ul>

      <p className="mt-4 text-xs text-slate-500">
        Webhook endpoint:{" "}
        <code className="text-slate-400">{status.webhookUrl}</code>
      </p>
      {!status.ok ? (
        <p className="mt-2 text-xs text-amber-300/90">
          Run{" "}
          <code className="text-amber-200">node scripts/setup-stripe-webhook.mjs</code>{" "}
          locally, then add both keys to Vercel. Use test card 4242 4242 4242 4242.
        </p>
      ) : null}
    </div>
  );
}

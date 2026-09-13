import Link from "next/link";

export type ResolutionActionMode = "automatic" | "guided" | "manual";

const modeCopy: Record<ResolutionActionMode, { label: string; hint: string }> = {
  automatic: { label: "Fix now", hint: "DigitalGate can safely fix this for you." },
  guided: { label: "Fix now", hint: "DigitalGate will take you to the right place and guide you through the fix." },
  manual: { label: "Fix this", hint: "Open the exact area where this needs to be corrected." },
};

export function ResolutionAction({ href = "/dashboard/advisor", mode = "guided", label, className = "", showHint = false }: {
  href?: string;
  mode?: ResolutionActionMode;
  label?: string;
  className?: string;
  showHint?: boolean;
}) {
  const copy = modeCopy[mode];
  return (
    <div className={className}>
      <Link href={href} className="inline-flex items-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70">
        {label ?? copy.label} →
      </Link>
      {showHint ? <p className="mt-1.5 text-xs text-slate-500">{copy.hint}</p> : null}
    </div>
  );
}

export function ResolutionButton({ onClick, mode = "automatic", label, disabled = false, busy = false, done = false, className = "" }: {
  onClick: () => void;
  mode?: ResolutionActionMode;
  label?: string;
  disabled?: boolean;
  busy?: boolean;
  done?: boolean;
  className?: string;
}) {
  const copy = modeCopy[mode];
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy || done} className={`inline-flex items-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
      {busy ? "Fixing…" : done ? "Fixed" : label ?? copy.label}
    </button>
  );
}

export function ResolutionFallback({ className = "" }: { className?: string }) {
  return <ResolutionAction href="/dashboard/advisor" mode="guided" label="Help me fix this" className={className} showHint />;
}

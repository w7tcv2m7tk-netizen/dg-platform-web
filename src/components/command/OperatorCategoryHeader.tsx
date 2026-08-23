import Link from "next/link";

export function OperatorCategoryHeader({
  eyebrow,
  title,
  question,
  backHref = "/command",
  backLabel = "Command Centre",
}: {
  eyebrow: string;
  title: string;
  question?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="space-y-2">
      <Link href={backHref} className="text-sm text-sky-400 hover:underline">
        ← {backLabel}
      </Link>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400/90">
        {eyebrow}
      </p>
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {question ? <p className="max-w-2xl text-sm text-slate-400">{question}</p> : null}
    </header>
  );
}

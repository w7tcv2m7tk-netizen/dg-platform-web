import Link from "next/link";

/** Thin customer-facing surfaces that deepen Twin / Health / Advisor — nav IA first. */
export function IntelligenceSurfacePage({
  title,
  eyebrow,
  summary,
  body,
  primaryHref = "/dashboard",
  primaryLabel = "Open Overview",
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  eyebrow: string;
  summary: string;
  body: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-blue-400/90">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">{summary}</p>
      </header>
      <main className="dg-page-main">
        <section className="dg-card max-w-2xl space-y-4">
          <p className="text-sm leading-relaxed text-slate-300">{body}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              {primaryLabel}
            </Link>
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}

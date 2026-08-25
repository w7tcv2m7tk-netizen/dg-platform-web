import Link from "next/link";

import { CommunicationsSubnav } from "@/components/communications/CommunicationsList";

export function CommunicationsChannelPlaceholder({
  active,
  title,
  summary,
  detail,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  active: string;
  title: string;
  summary: string;
  detail: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/communications" className="text-sm text-sky-400 hover:underline">
          ← Communications
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{summary}</p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommunicationsSubnav active={active} />
        <div className="max-w-xl rounded-lg border border-slate-700/70 bg-slate-950/40 px-4 py-5">
          <p className="text-sm text-slate-300">{detail}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {primaryHref && primaryLabel ? (
              <Link
                href={primaryHref}
                className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
              >
                {primaryLabel}
              </Link>
            ) : null}
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}

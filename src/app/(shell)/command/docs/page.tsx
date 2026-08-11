import Link from "next/link";
import {
  PLATFORM_DOC_GROUP_ORDER,
  PLATFORM_DOC_GROUP_LABELS,
} from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { listPlatformDocAvailability } from "@/lib/load-platform-doc";

export default async function CommandPlatformDocsPage() {
  const availability = await listPlatformDocAvailability();
  const byGroup = PLATFORM_DOC_GROUP_ORDER.map((group) => ({
    group,
    label: PLATFORM_DOC_GROUP_LABELS[group],
    docs: availability.filter((a) => a.entry.group === group),
  })).filter((g) => g.docs.length > 0);

  const missingCount = availability.filter((a) => !a.available).length;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
          Platform · Architecture
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Platform docs</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Curated DigitalGate documentation for staff review. Readable library first — not client
          Command Centre, and not the full Platform Intelligence AI layer yet.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="docs" />

        <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
          Staff / DigitalGate org only. Loaded from allowlisted paths under{" "}
          <code className="text-slate-300">docs/</code>
          {missingCount > 0 ? (
            <>
              {" "}
              · <span className="text-amber-200">{missingCount} missing on disk</span>
            </>
          ) : null}
        </div>

        {byGroup.map((section) => (
          <section key={section.group} className="space-y-3">
            <h2 className="text-lg font-semibold text-white">{section.label}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {section.docs.map(({ entry, available }) => (
                <li key={entry.slug}>
                  {available ? (
                    <Link
                      href={`/command/docs/${entry.slug}`}
                      className="dg-card block h-full transition-colors hover:border-sky-500/40"
                    >
                      <p className="font-medium text-white">{entry.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{entry.summary}</p>
                      <p className="mt-3 text-xs text-slate-500">docs/{entry.relativePath}</p>
                    </Link>
                  ) : (
                    <div className="dg-card h-full border-dashed border-amber-500/30 opacity-80">
                      <p className="font-medium text-white">{entry.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{entry.summary}</p>
                      <p className="mt-3 text-xs text-amber-200/90">
                        Missing: docs/{entry.relativePath}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {byGroup.length === 0 ? (
          <div className="dg-card border-amber-500/30">
            <p className="text-sm text-amber-100">No curated documents are configured.</p>
          </div>
        ) : null}
      </main>
    </>
  );
}

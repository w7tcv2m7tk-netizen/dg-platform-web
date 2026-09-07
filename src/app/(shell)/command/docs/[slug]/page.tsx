import Link from "next/link";
import { notFound } from "next/navigation";
import { PLATFORM_DOC_GROUP_LABELS, getPlatformDocBySlug } from "@dg/platform-core";

import { SafeMarkdown } from "@/components/command/SafeMarkdown";
import { loadPlatformDocBySlug } from "@/lib/load-platform-doc";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CommandPlatformDocReaderPage({ params }: PageProps) {
  await requirePlatformOperatorContext();
  const { slug } = await params;
  const catalogEntry = getPlatformDocBySlug(slug);
  if (!catalogEntry) {
    notFound();
  }

  const result = await loadPlatformDocBySlug(slug);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/docs" className="text-sm text-sky-400 hover:underline">
          ← Platform docs
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
          {PLATFORM_DOC_GROUP_LABELS[catalogEntry.group]}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{catalogEntry.title}</h1>
        <p className="mt-1 text-sm text-slate-400">{catalogEntry.summary}</p>
        <p className="mt-2 text-xs text-slate-500">docs/{catalogEntry.relativePath}</p>
      </header>
      <main className="dg-page-main space-y-6">
        {!result.ok ? (
          <div className="dg-card border-amber-500/30">
            <p className="font-medium text-white">
              {result.reason === "missing" ? "Document missing" : "Unable to load document"}
            </p>
            <p className="mt-2 text-sm text-amber-100/90">{result.message}</p>
            <p className="mt-3 text-xs text-slate-500">
              No content invented — the file must exist under the allowlisted repo path.
            </p>
          </div>
        ) : (
          <article className="dg-card">
            <SafeMarkdown source={result.content} />
          </article>
        )}
      </main>
    </>
  );
}

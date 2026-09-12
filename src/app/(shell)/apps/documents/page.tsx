import Link from "next/link";
import { summarizeOrgDocuments } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function DocumentsOverviewPage() {
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Documents</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  const summary = process.env.DATABASE_URL
    ? await summarizeOrgDocuments(session.organisationId)
    : {
        total: 0,
        byDocumentStatus: {} as Record<string, number>,
        bySigningStatus: {} as Record<string, number>,
        byKind: {} as Record<string, number>,
      };

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Documents</h1>
        <p className="mt-1 text-sm text-slate-400">
          Documents & Signing — the Core library for {session.organisationName}. Industry Apps
          can attach documents to the records and workflows they belong to.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/apps/documents/library" className="text-sky-400 hover:underline">
            Open document library
          </Link>
        </div>

        <section className="max-w-xl space-y-2">
          <p className="text-3xl font-semibold tabular-nums text-white">{summary.total}</p>
          <p className="text-sm text-slate-400">Documents on file</p>
          {Object.keys(summary.bySigningStatus).length > 0 ? (
            <div className="mt-4 space-y-4 text-sm text-slate-400">
              <ul className="space-y-1">
                {Object.entries(summary.byDocumentStatus).map(([status, n]) => (
                  <li key={`doc-${status}`}>
                    Document · {status}: {n}
                  </li>
                ))}
              </ul>
              <ul className="space-y-1">
                {Object.entries(summary.bySigningStatus).map(([status, n]) => (
                  <li key={`sign-${status}`}>
                    Signing · {status}: {n}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No documents yet. Upload from the library, or from an Industry App workflow.
            </p>
          )}
        </section>

        <p className="max-w-xl text-xs text-slate-500">
          DigitalGate keeps each document, its business context and signing lifecycle together.
          Upload a document, send it for signature when required, then track it through completion.
        </p>
      </main>
    </>
  );
}

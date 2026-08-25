import Link from "next/link";

export default function DocumentsSigningPage() {
  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/documents/library" className="text-sm text-sky-400 hover:underline">
          ← Documents
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Signing</h1>
        <p className="mt-1 text-sm text-slate-400">
          Request, track and complete signatures — Documents owns the file; signing is the
          lifecycle.
        </p>
      </header>
      <main className="dg-page-main">
        <div className="max-w-xl rounded-lg border border-slate-700/70 bg-slate-950/40 px-4 py-5 text-sm text-slate-300">
          <p>
            Signing workflows land here. Until the full signing console ships, prepare documents in
            the library and track status from CRM Timeline and Opportunities.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/apps/documents/library"
              className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
            >
              Library
            </Link>
            <Link
              href="/apps/documents/templates"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
            >
              Templates
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

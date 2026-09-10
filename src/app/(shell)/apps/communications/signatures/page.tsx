import Link from "next/link";
import { notFound } from "next/navigation";
import { listCommunicationSignatures, sessionHasFeature } from "@dg/platform-core";

import { SignatureStudio } from "@/components/communications/SignatureStudio";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function CommunicationsSignaturesPage() {
  const session = await getAuthorisedPlatformPageSession("communications.read");
  if (!session) notFound();

  const signatures = process.env.DATABASE_URL
    ? await listCommunicationSignatures(session.organisationId)
    : [];
  const canWrite = sessionHasFeature(session, "communications.write");

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/communications" className="text-sm text-sky-400 hover:underline">
          ← Communications
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Signature Studio</h1>
        <p className="mt-1 text-sm text-slate-400">
          Org email signatures for {session.organisationName}. The default is appended when you
          send from Compose.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {canWrite ? (
          <SignatureStudio initial={signatures} />
        ) : (
          <div className="max-w-3xl space-y-4">
            <p className="text-sm text-slate-500">You have read-only access to Communications.</p>
            {!signatures.length ? (
              <p className="text-sm text-slate-500">No signatures configured.</p>
            ) : (
              <ul className="space-y-3">
                {signatures.map((row) => (
                  <li key={row.id} className="rounded-lg border border-slate-700/70 bg-slate-950/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{row.name}</p>
                      {row.isDefault ? <span className="text-xs text-emerald-400">Default</span> : null}
                    </div>
                    <div className="mt-3 rounded-md bg-white px-4 py-3 text-sm text-slate-900" dangerouslySetInnerHTML={{ __html: row.html }} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </>
  );
}

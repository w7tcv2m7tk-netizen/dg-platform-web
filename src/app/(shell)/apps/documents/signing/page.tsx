import Link from "next/link";
import { dropboxSignConfigured, listOrgDocuments } from "@dg/platform-core";

import { DocumentsSigningConsole } from "@/components/documents/DocumentsSigningConsole";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function DocumentsSigningPage() {
  const session = await getAuthorisedPlatformPageSession("documents.read");
  if (!session) return null;

  const documents = await listOrgDocuments({
    organisationId: session.organisationId,
    limit: 100,
  });

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/documents/library" className="text-sm text-sky-400 hover:underline">
          ← Documents
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Signing</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Send documents for signature, track signer progress and retain the completed signed PDF in
          the organisation document record.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <DocumentsSigningConsole
          providerConfigured={dropboxSignConfigured()}
          initialDocuments={documents.map((document) => ({
            id: document.id,
            name: document.name,
            kind: document.kind,
            signingStatus: document.signingStatus,
            signingProvider: document.signingProvider,
            updatedAt: document.updatedAt,
          }))}
        />
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/apps/documents/library" className="text-sky-400 hover:underline">
            Document Library →
          </Link>
          <Link href="/apps/documents/templates" className="text-sky-400 hover:underline">
            Templates →
          </Link>
        </div>
      </main>
    </>
  );
}

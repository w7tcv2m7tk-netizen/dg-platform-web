import Link from "next/link";
import { SectionPageHeader } from "@/components/ui/SectionPageHeader";
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
      <SectionPageHeader section="Documents" title="Signing" />
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
          <Link href="/apps/documents" className="text-slate-400 hover:underline">
            Documents overview →
          </Link>
        </div>
      </main>
    </>
  );
}

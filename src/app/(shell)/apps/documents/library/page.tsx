import Link from "next/link";
import { listOrgDocuments } from "@dg/platform-core";

import { DocumentsUploadForm } from "@/components/documents/DocumentsUploadForm";
import { getPlatformPageContext } from "@/lib/platform-page-context";

interface PageProps {
  searchParams: Promise<{
    kind?: string;
    entityType?: string;
    entityId?: string;
    status?: string;
  }>;
}

function kindLabel(kind: string) {
  return kind.replace(/_/g, " ");
}

export default async function DocumentsLibraryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Document library</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  const documents = process.env.DATABASE_URL
    ? await listOrgDocuments({
        organisationId: session.organisationId,
        kind: params.kind?.trim() || undefined,
        entityType: params.entityType?.trim() || undefined,
        entityId: params.entityId?.trim() || undefined,
        signingStatus: params.status?.trim() || undefined,
        limit: 100,
      })
    : [];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/documents" className="text-sm text-sky-400 hover:underline">
          ← Documents
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Library</h1>
        <p className="mt-1 text-sm text-slate-400">
          Org-scoped documents. Filter by property from Real Estate panels.
        </p>
      </header>
      <main className="dg-page-main space-y-10">
        <section>
          <h2 className="text-sm font-medium text-slate-200">Upload</h2>
          <div className="mt-3">
            <DocumentsUploadForm
              defaultKind={params.kind?.trim() || "other"}
              entityType={params.entityType?.trim()}
              entityId={params.entityId?.trim()}
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-slate-200">
            Documents ({documents.length})
          </h2>
          {documents.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No documents match this filter.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-800 border-t border-slate-800">
              {documents.map((doc) => {
                const link = doc.links[0];
                return (
                  <li key={doc.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                    <div>
                      <Link
                        href={`/apps/documents/library/${doc.id}`}
                        className="text-sm font-medium text-white hover:text-sky-300"
                      >
                        {doc.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {kindLabel(doc.kind)} · {doc.documentStatus} · signing{" "}
                        {doc.signingStatus}
                        {link ? ` · ${link.entityType}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:underline"
                        >
                          Download
                        </a>
                      ) : null}
                      {link?.entityType === "property" ? (
                        <Link
                          href={`/apps/re/properties/${link.entityId}`}
                          className="text-slate-400 hover:underline"
                        >
                          Property
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

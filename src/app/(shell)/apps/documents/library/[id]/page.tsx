import Link from "next/link";
import { getOrgDocument } from "@dg/platform-core";
import { notFound } from "next/navigation";

import { getPlatformPageContext } from "@/lib/platform-page-context";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Document</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  const document = process.env.DATABASE_URL
    ? await getOrgDocument(session.organisationId, id)
    : null;
  if (!document) notFound();

  const link = document.links[0];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/documents/library" className="text-sm text-sky-400 hover:underline">
          ← Library
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{document.name}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {document.kind.replace(/_/g, " ")}
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <dl className="grid max-w-lg gap-3 text-sm">
          <div>
            <dt className="text-slate-500">Document status</dt>
            <dd className="text-slate-200">{document.documentStatus}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Signing status</dt>
            <dd className="text-slate-200">{document.signingStatus}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Version</dt>
            <dd className="text-slate-200">{document.version}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Updated</dt>
            <dd className="text-slate-200">
              {new Date(document.updatedAt).toLocaleString("en-AU")}
            </dd>
          </div>
          {document.sourceApp ? (
            <div>
              <dt className="text-slate-500">Source app</dt>
              <dd className="text-slate-200">{document.sourceApp}</dd>
            </div>
          ) : null}
        </dl>
        <div className="flex flex-wrap gap-4 text-sm">
          {document.url ? (
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:underline"
            >
              View / download
            </a>
          ) : null}
          {link?.entityType === "property" ? (
            <Link
              href={`/apps/re/properties/${link.entityId}`}
              className="text-sky-400 hover:underline"
            >
              Open property
            </Link>
          ) : null}
        </div>
      </main>
    </>
  );
}

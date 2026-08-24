import Link from "next/link";

import { REAL_ESTATE_DOCUMENT_TEMPLATES } from "@dg/platform-core";

export default function DocumentsTemplatesPage() {
  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/documents" className="text-sm text-sky-400 hover:underline">
          ← Documents
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Templates</h1>
        <p className="mt-1 text-sm text-slate-400">
          Industry templates will populate from CRM. Catalogue only for now.
        </p>
      </header>
      <main className="dg-page-main">
        <ul className="max-w-xl space-y-4 text-sm text-slate-400">
          {REAL_ESTATE_DOCUMENT_TEMPLATES.map((t) => (
            <li key={t.id} className="border-t border-slate-800 pt-4">
              <p className="font-medium text-slate-200">{t.label}</p>
              <p className="mt-1 text-xs text-slate-500">
                {t.industryAppId} · {t.kind}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

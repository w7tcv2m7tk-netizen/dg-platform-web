import Link from "next/link";
import { listCommunicationSignatures } from "@dg/platform-core";

import { CommunicationsSubnav } from "@/components/communications/CommunicationsList";
import { SignatureStudio } from "@/components/communications/SignatureStudio";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommunicationsSignaturesPage() {
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Signatures</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  const signatures = process.env.DATABASE_URL
    ? await listCommunicationSignatures(session.organisationId)
    : [];

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
        <CommunicationsSubnav active="signatures" />
        <SignatureStudio initial={signatures} />
      </main>
    </>
  );
}

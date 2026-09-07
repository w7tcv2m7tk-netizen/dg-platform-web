import Link from "next/link";
import { notFound } from "next/navigation";
import { listCommunicationSignatures } from "@dg/platform-core";

import { SignatureStudio } from "@/components/communications/SignatureStudio";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function CommunicationsSignaturesPage() {
  const session = await getAuthorisedPlatformPageSession("communications.read");
  if (!session) notFound();

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
        <SignatureStudio initial={signatures} />
      </main>
    </>
  );
}

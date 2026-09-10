import { notFound } from "next/navigation";

import { DomainsConsole } from "@/components/infrastructure/DomainsConsole";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

/** DigitalGate Domains — search, register (gated), connect, DNS. */
export default async function Page() {
  const session = await getAuthorisedPlatformPageSession("infrastructure.read");
  if (!session) notFound();

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Domains</h1>
        <p className="text-sm text-slate-400">
          Founding Customer Early Access · Search, connect, DNS, Make it live
          {session.organisationName ? ` · ${session.organisationName}` : ""}
        </p>
      </header>
      <main className="dg-page-main">
        <DomainsConsole />
      </main>
    </>
  );
}

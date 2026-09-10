import { notFound } from "next/navigation";

import { DnsConsole } from "@/components/infrastructure/DnsConsole";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

/**
 * DNS Infrastructure — zone inspect, suggested hosting records, Apply website DNS.
 * Auth / email DNS stays under Email. Domain search/register under Domains.
 */
export default async function DnsInfrastructurePage() {
  const session = await getAuthorisedPlatformPageSession("infrastructure.read");
  if (!session) notFound();
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">DNS</h1>
        <p className="text-sm text-slate-400">
          Infrastructure service · website hosting records + zone status
        </p>
      </header>
      <main className="dg-page-main">
        <DnsConsole />
      </main>
    </>
  );
}

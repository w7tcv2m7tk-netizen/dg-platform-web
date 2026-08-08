import Link from "next/link";

import { DomainsConsole } from "@/components/infrastructure/DomainsConsole";
import { WebsitesSubnav } from "@/components/websites/WebsitesSubnav";

export default function WebsitesDomainsPage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Domains</h1>
        <p className="text-sm text-slate-400">
          Connect or register a domain, then Make it live from Website Studio.
        </p>
      </header>
      <main className="dg-page-main space-y-4">
        <WebsitesSubnav active="domains" />
        <p className="text-sm text-slate-400 max-w-xl">
          Same DigitalGate Domains surface as Infrastructure.{" "}
          <Link href="/apps/infrastructure/domains" className="text-sky-400 hover:underline">
            Open Infrastructure Domains →
          </Link>
        </p>
        <DomainsConsole />
      </main>
    </>
  );
}

import Link from "next/link";

import { DnsConsole } from "@/components/infrastructure/DnsConsole";

/**
 * DNS Infrastructure — zone inspect, suggested hosting records, Apply website DNS.
 * Auth / email DNS stays under Email. Domain search/register under Domains.
 */
export default function DnsInfrastructurePage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">DNS</h1>
        <p className="text-sm text-slate-400">
          Infrastructure service · website hosting records + zone status
          {" · "}
          <Link
            href="/apps/infrastructure/domains"
            className="text-sky-400 hover:underline"
          >
            Domains
          </Link>
          {" · "}
          <Link
            href="/apps/infrastructure/email"
            className="text-sky-400 hover:underline"
          >
            Email
          </Link>
        </p>
      </header>
      <main className="dg-page-main">
        <DnsConsole />
      </main>
    </>
  );
}

import Link from "next/link";
import { getEmailInfrastructureOverview } from "@dg/platform-core";

import { EmailInfrastructureConsole } from "@/components/infrastructure/EmailInfrastructureConsole";

/**
 * Email Infrastructure — prepare sending domain, apply auth DNS, verify.
 * @see docs/foundations/EMAIL-INFRASTRUCTURE.md
 */
export default async function EmailInfrastructurePage() {
  const overview = await getEmailInfrastructureOverview();

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Email</h1>
        <p className="text-sm text-slate-400">
          Infrastructure service · transactional + auth DNS (not a mail server)
          {" · "}
          <Link
            href="/apps/infrastructure/domains"
            className="text-sky-400 hover:underline"
          >
            Domains
          </Link>
          {" · "}
          <Link
            href="/apps/infrastructure/dns"
            className="text-sky-400 hover:underline"
          >
            DNS
          </Link>
        </p>
      </header>
      <main className="dg-page-main max-w-2xl">
        <EmailInfrastructureConsole initialOverview={overview} />
      </main>
    </>
  );
}

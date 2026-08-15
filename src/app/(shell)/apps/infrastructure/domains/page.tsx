import { getInfraDomainsBetaReadiness } from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

import { DomainsConsole } from "@/components/infrastructure/DomainsConsole";
import { InfraDomainsBetaChecklist } from "@/components/infrastructure/InfraDomainsBetaChecklist";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

/** DigitalGate Domains — search, register (gated), connect, DNS + beta checklist. */
export default async function Page() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  const readiness =
    session && process.env.DATABASE_URL
      ? await getInfraDomainsBetaReadiness(session.organisationId)
      : null;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Domains</h1>
        <p className="text-sm text-slate-400">
          Founding Customer Early Access · Search, connect, DNS, Make it live
          {session?.organisationName ? ` · ${session.organisationName}` : ""}
          {" · "}
          <Link href="/apps/infrastructure/dns" className="text-sky-400 hover:underline">
            DNS
          </Link>
          {" · "}
          <Link href="/apps/infrastructure/email" className="text-sky-400 hover:underline">
            Email
          </Link>
        </p>
      </header>
      <main className="dg-page-main">
        {readiness ? <InfraDomainsBetaChecklist readiness={readiness} /> : null}
        <DomainsConsole />
      </main>
    </>
  );
}

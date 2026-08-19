import { currentUser } from "@clerk/nextjs/server";

import { DomainsConsole } from "@/components/infrastructure/DomainsConsole";
import { InfrastructureNav } from "@/components/infrastructure/InfrastructureNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

/** DigitalGate Domains — search, register (gated), connect, DNS. */
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

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Domains</h1>
        <p className="text-sm text-slate-400">
          Founding Customer Early Access · Search, connect, DNS, Make it live
          {session?.organisationName ? ` · ${session.organisationName}` : ""}
        </p>
      </header>
      <main className="dg-page-main">
        <InfrastructureNav active="domains" />
        <DomainsConsole />
      </main>
    </>
  );
}

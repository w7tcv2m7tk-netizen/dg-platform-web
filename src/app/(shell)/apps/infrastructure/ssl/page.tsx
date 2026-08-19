import { currentUser } from "@clerk/nextjs/server";
import { listOrganisationDomains } from "@dg/platform-core";

import { InfrastructureNav } from "@/components/infrastructure/InfrastructureNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function InfrastructureSslPage() {
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

  const domains = session
    ? await listOrganisationDomains(session.organisationId)
    : [];
  const active = domains.filter((d) => d.sslState === "active").length;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">SSL</h1>
        <p className="text-sm text-slate-400">
          Certificates stay automatic on the default path — issued when a domain is attached to
          hosting. This is the inventory, not a certificate shop.
        </p>
      </header>
      <main className="dg-page-main max-w-3xl space-y-6">
        <InfrastructureNav active="ssl" />
        {!session ? (
          <p className="text-sm text-slate-400">Sign in to see SSL status.</p>
        ) : (
          <>
            <p className="text-sm text-slate-400">
              {active} of {domains.length} inventoried domain{domains.length === 1 ? "" : "s"}{" "}
              marked SSL active.
            </p>
            {domains.length ? (
              <ul className="space-y-2">
                {domains.map((domain) => (
                  <li
                    key={domain.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-white">{domain.name}</span>
                    <span className="text-slate-400">
                      SSL: {domain.sslState}
                      {domain.dnsConfiguredAt ? " · DNS configured" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">
                Connect a domain under Domains, then Make it live — SSL follows hosting attach.
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}

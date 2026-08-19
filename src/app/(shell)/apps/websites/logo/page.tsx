import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { getOrganisationBusinessProfile } from "@dg/platform-core";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";
import { LogoDesignStudioClient } from "@/components/websites/LogoDesignStudioClient";
import { WebsitesSubnav } from "@/components/websites/WebsitesSubnav";

export default async function LogoDesignStudioPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
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

  const profile = session
    ? ((await getOrganisationBusinessProfile(session.organisationId)) ?? {})
    : null;
  const fromCreate = (await searchParams)?.from === "website-create";

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Brand</h1>
        <p className="text-sm text-slate-400">
          Logo, icon, and colours for {session?.organisationName ?? "this organisation"} —
          one identity for the sidebar, websites, invoices, and email.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <WebsitesSubnav active="logo" />

        {!session || !profile ? (
          <p className="text-sm text-slate-400">Sign in to edit brand assets.</p>
        ) : (
          <>
            <LogoDesignStudioClient initial={profile} />
            {fromCreate ? (
              <p className="text-sm text-slate-400">
                Done?{" "}
                <Link href="/apps/websites" className="text-sky-400 hover:underline">
                  Return to Websites → Create
                </Link>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Same record as{" "}
                <Link href="/dashboard/business" className="text-slate-300 underline">
                  Business Profile
                </Link>
                .
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}

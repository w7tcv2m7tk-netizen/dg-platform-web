import Link from "next/link";
import { getOrganisationBusinessProfile, sessionCan } from "@dg/platform-core";

import { LogoDesignStudioClient } from "@/components/websites/LogoDesignStudioClient";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function LogoDesignStudioPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
  const session = await getAuthorisedPlatformPageSession("websites.read");
  const profile = session
    ? ((await getOrganisationBusinessProfile(session.organisationId)) ?? {})
    : null;
  const canEditBrand = session
    ? sessionCan(session, { module: "settings", action: "edit", scope: "organisation" })
    : false;
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
        {!session || !profile ? (
          <p className="text-sm text-slate-400">Sign in to view brand assets.</p>
        ) : canEditBrand ? (
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
                These brand settings are shared with your{" "}
                <Link href="/dashboard/business" className="text-slate-300 underline">
                  Business Profile
                </Link>
                .
              </p>
            )}
          </>
        ) : (
          <div className="max-w-xl rounded-lg border border-slate-700 bg-slate-900/40 p-5">
            <h2 className="font-semibold text-white">Read-only brand access</h2>
            <p className="mt-1 text-sm text-slate-400">
              You can view this business&apos;s brand through its websites, but changing organisation-wide brand settings requires additional access.
            </p>
          </div>
        )}
      </main>
    </>
  );
}

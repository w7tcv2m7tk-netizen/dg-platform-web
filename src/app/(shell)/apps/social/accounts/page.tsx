import Link from "next/link";
import { getOrganisationBusinessProfile } from "@dg/platform-core";

import { SocialSubnav } from "@/components/social/SocialSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";
import { getSocialUrl, SOCIAL_PROFILE_FIELDS } from "@/lib/social-profile-fields";

export default async function SocialAccountsPage() {
  const { session: platformSession } = await getPlatformPageContext();
  const profile = platformSession
    ? await getOrganisationBusinessProfile(platformSession.organisationId)
    : null;
  const social = profile?.social;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/social" className="text-sm text-blue-400 hover:underline">
          ← Social overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Accounts</h1>
        <p className="text-sm text-slate-400">Linked URLs from Business Profile</p>
        <SocialSubnav active="/apps/social/accounts" />
      </header>
      <main className="dg-page-main space-y-6">
        <section className="dg-card">
          <h2 className="font-semibold text-white">Social channels</h2>
          <ul className="mt-4 space-y-3">
            {SOCIAL_PROFILE_FIELDS.map((field) => {
              const url = getSocialUrl(social, field.key);
              return (
                <li
                  key={field.key}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-white">{field.label}</p>
                    <span
                      className={
                        url
                          ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
                          : "rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
                      }
                    >
                      {url ? "Linked URL" : "Not linked"}
                    </span>
                  </div>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block truncate text-sm text-blue-400 hover:underline"
                    >
                      {url}
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Add in{" "}
                      <Link href="/dashboard/business" className="text-blue-400 hover:underline">
                        Business Profile
                      </Link>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="dg-card border-amber-500/20">
          <h2 className="font-semibold text-white">OAuth publishing</h2>
          <p className="mt-2 text-sm text-slate-300">
            Meta and LinkedIn OAuth for direct publishing is not connected yet. URLs above are
            profile links only — use Compose to save drafts until publish connectors ship.
          </p>
          <p className="mt-3 text-sm">
            <Link href="/dashboard/business" className="text-blue-400 hover:underline">
              Manage Business Profile →
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}

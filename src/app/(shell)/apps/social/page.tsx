import Link from "next/link";
import { getOrganisationBusinessProfile } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/org-apps";
import {
  getSocialUrl,
  listSocialGaps,
  SOCIAL_PROFILE_FIELDS,
  socialCompletenessPercent,
} from "@/lib/social-profile-fields";

export default async function SocialOverviewPage() {
  const { session: platformSession } = await getPlatformPageContext();
  const profile = platformSession
    ? await getOrganisationBusinessProfile(platformSession.organisationId)
    : null;
  const social = profile?.social;
  const completeness = socialCompletenessPercent(social);
  const gaps = listSocialGaps(social);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard" className="text-sm text-sky-400 hover:underline">
          ← Overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Social</h1>
        <p className="text-sm text-slate-400">
          Profile links, local drafts, LinkedIn connect
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-slate-300">
          <p className="font-medium text-amber-200">Honestly deferred for closed beta</p>
          <p className="mt-1 text-slate-400">
            Publishing to networks is not live yet. LinkedIn can be connected under Accounts.
            This surface still tracks Business Profile URLs and local drafts — no fake engagement
            charts.
          </p>
        </div>

        <section className="dg-card">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Profile completeness</p>
              <p className="mt-1 text-4xl font-bold text-white">{completeness}%</p>
            </div>
            <Link
              href="/dashboard/business"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Edit Business Profile
            </Link>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {SOCIAL_PROFILE_FIELDS.map((field) => {
              const url = getSocialUrl(social, field.key);
              return (
                <li
                  key={field.key}
                  className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm"
                >
                  <span className="text-slate-400">{field.label}</span>
                  <span className={url ? "text-emerald-400" : "text-slate-500"}>
                    {url ? "Linked" : "Missing"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {gaps.length > 0 ? (
          <section className="dg-card">
            <h2 className="font-semibold text-white">Gaps to close</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {gaps.map((gap) => (
                <li key={gap}>{gap} URL not set on Business Profile</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="dg-card">
          <h2 className="font-semibold text-white">What works now</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>
              <Link href="/apps/social/compose" className="text-sky-400 hover:underline">
                Compose
              </Link>{" "}
              — save local drafts as Activity (no OAuth publish)
            </li>
            <li>
              <Link href="/apps/social/accounts" className="text-sky-400 hover:underline">
                Accounts
              </Link>{" "}
              — Connect LinkedIn; Meta still pending
            </li>
            <li>
              <Link href="/dashboard/business" className="text-sky-400 hover:underline">
                Business Profile
              </Link>{" "}
              — social URLs feed presence / AI Visibility context
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}

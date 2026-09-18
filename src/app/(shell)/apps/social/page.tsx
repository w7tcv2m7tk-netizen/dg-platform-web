import Link from "next/link";
import { fetchOrgLinkedInCompanyEvidence, getOrganisationBusinessProfile } from "@dg/platform-core";

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
  const linkedIn = platformSession
    ? await fetchOrgLinkedInCompanyEvidence(platformSession.organisationId)
    : { ok: false as const, message: "No active organisation session" };
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
          Connected social evidence, profile links and local drafts
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-slate-300">
          <p className="font-medium text-amber-200">Honestly deferred for closed beta</p>
          <p className="mt-1 text-slate-400">
            Publishing to networks is not live yet. LinkedIn and Meta can be connected under Accounts, with organisation-scoped company/page selection and Meta evidence. This surface also tracks Business Profile URLs and local drafts — no fake engagement charts.
          </p>
        </div>

        <section className="dg-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">LinkedIn evidence</p>
              <h2 className="mt-1 font-semibold text-white">{linkedIn.ok ? linkedIn.data.profile.name || linkedIn.data.organization.name || "Selected company page" : "Company page not available"}</h2>
              {linkedIn.ok ? <p className="mt-1 text-sm text-slate-400">{linkedIn.data.profile.vanityName ? `linkedin.com/company/${linkedIn.data.profile.vanityName}` : "Organisation-scoped company identity verified"}</p> : <p className="mt-1 text-sm text-slate-400">{linkedIn.message}</p>}
            </div>
            <Link href="/apps/social/accounts" className="text-sm text-sky-400 hover:underline">Manage connection →</Link>
          </div>
        </section>

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
              — manage organisation-scoped LinkedIn and Meta connections, Facebook/Instagram selection and Meta Ads accounts
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

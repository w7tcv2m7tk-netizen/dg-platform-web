import Link from "next/link";
import { fetchOrgLinkedInSocialEvidence, fetchOrgYouTubeContentEvidence, fetchOrgYouTubeAnalyticsEvidence, getOrganisationBusinessProfile } from "@dg/platform-core";

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
    ? await fetchOrgLinkedInSocialEvidence(platformSession.organisationId)
    : { ok: false as const, message: "No active organisation session" };
  const [youtubeContent, youtubeAnalytics] = platformSession ? await Promise.all([fetchOrgYouTubeContentEvidence(platformSession.organisationId), fetchOrgYouTubeAnalyticsEvidence(platformSession.organisationId)]) : [{ ok:false as const, message:"No active organisation session" }, { ok:false as const, message:"No active organisation session" }];
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
          <p className="font-medium text-amber-200">Publishing is not enabled yet</p>
          <p className="mt-1 text-slate-400">
            Connected evidence is live for supported organisation-scoped Meta and YouTube resources. LinkedIn company evidence becomes available when LinkedIn grants the required organisation API access. Compose currently saves local drafts; direct network publishing is not enabled yet.
          </p>
        </div>

        <section className="dg-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">LinkedIn evidence</p>
              <h2 className="mt-1 font-semibold text-white">{linkedIn.ok ? linkedIn.data.company.profile.name || linkedIn.data.company.organization.name || "Selected company page" : "Company page not available"}</h2>
              {linkedIn.ok ? <p className="mt-1 text-sm text-slate-400">{linkedIn.data.company.profile.vanityName ? `linkedin.com/company/${linkedIn.data.company.profile.vanityName}` : "Organisation-scoped company identity verified"}</p> : <p className="mt-1 text-sm text-slate-400">{linkedIn.message}</p>}
            </div>
            <Link href="/apps/social/accounts" className="text-sm text-sky-400 hover:underline">Manage connection →</Link>
          </div>
        </section>

        {linkedIn.ok ? (
          <section className="dg-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Recent LinkedIn content</p>
                <h2 className="mt-1 font-semibold text-white">{linkedIn.data.posts.length ? `${linkedIn.data.posts.length} recent company post${linkedIn.data.posts.length === 1 ? "" : "s"} available as evidence` : "No recent company posts available"}</h2>
                <p className="mt-1 text-sm text-slate-400">{linkedIn.data.permissionLimited ? linkedIn.data.message : "Live organisation content from the LinkedIn company page selected for this tenant."}</p>
              </div>
            </div>
            {linkedIn.data.posts.length ? <ul className="mt-4 space-y-3">{linkedIn.data.posts.slice(0, 5).map((post) => <li key={post.urn} className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300"><p>{post.commentary || "LinkedIn company post"}</p>{post.publishedAt ? <p className="mt-1 text-xs text-slate-500">{new Date(post.publishedAt).toLocaleDateString("en-AU")}</p> : null}</li>)}</ul> : null}
          </section>
        ) : null}

        {youtubeContent.ok ? <section className="dg-card"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-slate-500">YouTube evidence</p><h2 className="mt-1 font-semibold text-white">{youtubeContent.data.reduce((n,row)=>n+row.videos.length,0)} recent video{youtubeContent.data.reduce((n,row)=>n+row.videos.length,0)===1?"":"s"} across {youtubeContent.data.length} selected channel{youtubeContent.data.length===1?"":"s"}</h2><p className="mt-1 text-sm text-slate-400">{youtubeAnalytics.ok ? `${youtubeAnalytics.data.reduce((n,row)=>n+row.views,0).toLocaleString("en-AU")} views · ${Math.round(youtubeAnalytics.data.reduce((n,row)=>n+row.estimatedMinutesWatched,0)).toLocaleString("en-AU")} minutes watched in the last 30 days` : "Recent channel content is available; private YouTube Analytics requires the authorised Analytics scope."}</p></div><Link href="/apps/social/accounts" className="text-sm text-sky-400 hover:underline">Manage channels →</Link></div>{youtubeContent.data.some(row=>row.videos.length)?<ul className="mt-4 space-y-3">{youtubeContent.data.flatMap(row=>row.videos).slice(0,5).map(video=><li key={video.id} className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300"><p>{video.title}</p><p className="mt-1 text-xs text-slate-500">{video.publishedAt?new Date(video.publishedAt).toLocaleDateString("en-AU"):""}{video.views!==null?` · ${video.views.toLocaleString("en-AU")} views`:""}</p></li>)}</ul>:null}</section> : null}

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
              — manage organisation-scoped LinkedIn, Meta and YouTube connections and resource selections
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

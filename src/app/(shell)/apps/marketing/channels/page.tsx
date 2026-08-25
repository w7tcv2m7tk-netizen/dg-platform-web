import Link from "next/link";
import { getOrganisationBusinessProfile } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/org-apps";
import { getSocialUrl, SOCIAL_PROFILE_FIELDS } from "@/lib/social-profile-fields";

export default async function MarketingChannelsPage() {
  const { session: platformSession } = await getPlatformPageContext();
  const profile = platformSession
    ? await getOrganisationBusinessProfile(platformSession.organisationId)
    : null;

  const websiteUrl = profile?.websiteUrl?.trim() ?? "";
  const socialFilled = SOCIAL_PROFILE_FIELDS.filter((field) =>
    getSocialUrl(profile?.social, field.key),
  ).length;
  const socialTotal = SOCIAL_PROFILE_FIELDS.length;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/marketing" className="text-sm text-blue-400 hover:underline">
          ← Marketing overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Channels</h1>
        <p className="text-sm text-slate-400">Website and social completeness from Business Profile</p>
      </header>
      <main className="dg-page-main space-y-6">
        <section className="dg-card">
          <h2 className="font-semibold text-white">Website</h2>
          {websiteUrl ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-sm text-blue-400 hover:underline"
            >
              {websiteUrl}
            </a>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No website URL —{" "}
              <Link href="/dashboard/business" className="text-blue-400 hover:underline">
                add in Business Profile
              </Link>
            </p>
          )}
        </section>

        <section className="dg-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Social channels</h2>
              <p className="mt-1 text-sm text-slate-400">
                {socialFilled} of {socialTotal} linked
              </p>
            </div>
            <Link href="/apps/social" className="text-sm text-blue-400 hover:underline">
              Social app →
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {SOCIAL_PROFILE_FIELDS.map((field) => {
              const url = getSocialUrl(profile?.social, field.key);
              return (
                <li
                  key={field.key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm"
                >
                  <span className="text-slate-400">{field.label}</span>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-blue-400 hover:underline"
                    >
                      Linked
                    </a>
                  ) : (
                    <span className="text-slate-500">Missing</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/dashboard/business" className="text-blue-400 hover:underline">
              Edit Business Profile →
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}

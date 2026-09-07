import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationBusinessProfile } from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function formatLocation(
  profile: NonNullable<Awaited<ReturnType<typeof getOrganisationBusinessProfile>>>,
) {
  const primary = profile.locations?.find((l) => l.isPrimary) ?? profile.locations?.[0];
  if (primary) {
    return [primary.city, primary.state, primary.country].filter(Boolean).join(", ");
  }
  const addr = profile.address;
  if (addr) {
    return [addr.city, addr.state, addr.country].filter(Boolean).join(", ");
  }
  return null;
}

const SOCIAL_LABELS: Record<string, string> = {
  googleBusiness: "Google Business",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  pinterest: "Pinterest",
};

export default async function CommsKnowledgePage() {
  const session = await getAuthorisedPlatformPageSession("comms.knowledge.read");
  if (!session) notFound();

  const profile = await getOrganisationBusinessProfile(session.organisationId);

  const businessName =
    profile?.tradingName?.trim() || profile?.businessName?.trim() || null;
  const industry = profile?.industryVertical?.trim() || null;
  const location = profile ? formatLocation(profile) : null;
  const website = profile?.websiteUrl?.trim() || null;
  const socialEntries = profile?.social
    ? Object.entries(profile.social).filter(([, v]) => v?.trim())
    : [];

  const voice = profile?.brandVoice;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Agent knowledge</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · profile-sourced context for AI agents
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="dg-card">
          <h2 className="font-semibold text-white">Business Profile pack</h2>
          <p className="mt-1 text-sm text-slate-400">
            Read-only snapshot from your Digital Business Identity — no vector database in this phase.
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-slate-500">Business name</dt><dd className="text-white">{businessName ?? "—"}</dd></div>
            <div>
              <dt className="text-slate-500">Website</dt>
              <dd className="text-white">
                {website ? <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{website}</a> : "—"}
              </dd>
            </div>
            <div><dt className="text-slate-500">Industry</dt><dd className="text-white">{industry ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Location</dt><dd className="text-white">{location ?? "—"}</dd></div>
          </dl>
        </div>

        {socialEntries.length > 0 ? (
          <div className="dg-card">
            <h2 className="font-semibold text-white">Social links</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {socialEntries.map(([key, url]) => (
                <li key={key}>
                  <span className="text-slate-500">{SOCIAL_LABELS[key] ?? key}: </span>
                  <a href={url!.startsWith("http") ? url! : `https://${url}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{url}</a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {voice?.tagline || voice?.services || voice?.targetAudience || voice?.tone ? (
          <div className="dg-card">
            <h2 className="font-semibold text-white">Brand voice & description</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {voice.tagline ? <div><dt className="text-slate-500">Tagline</dt><dd className="text-white">{voice.tagline}</dd></div> : null}
              {voice.tone ? <div><dt className="text-slate-500">Tone</dt><dd className="text-white">{voice.tone}</dd></div> : null}
              {voice.services ? <div><dt className="text-slate-500">Services</dt><dd className="whitespace-pre-wrap text-white">{voice.services}</dd></div> : null}
              {voice.targetAudience ? <div><dt className="text-slate-500">Target audience</dt><dd className="text-white">{voice.targetAudience}</dd></div> : null}
            </dl>
          </div>
        ) : null}

        <div className="dg-card">
          <p className="text-sm text-slate-400">Update source data in Business Profile to refresh what agents know about your business.</p>
          <Link href="/dashboard/business" className="mt-3 inline-block text-sm text-blue-400 hover:underline">Edit Business Profile →</Link>
        </div>
      </main>
    </>
  );
}

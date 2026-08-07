import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { listOrganisationMembers } from "@dg/platform-core";

import { TeamProfileEditor } from "@/components/platform/TeamProfileEditor";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function TeamSettingsPage() {
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

  const members = session
    ? await listOrganisationMembers(session.organisationId)
    : [];

  const isOwner = session?.role === "owner" || session?.role === "admin";

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard/settings" className="text-sm text-blue-400 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Team & access</h1>
        <p className="text-sm text-slate-400">
          Team profiles, bios, and website agent sync — invites still go through Clerk
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="dg-card max-w-2xl">
          <h2 className="font-semibold text-white">Your profile</h2>
          <p className="mt-2 text-sm text-slate-400">
            Add a short description about yourself. For Real Estate orgs this also syncs to
            the website agent profile when you save (and when you publish listings).
          </p>
        </div>

        {session ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {members.map((member) => {
              const isMe = member.clerkUserId === session.clerkUserId;
              return (
                <TeamProfileEditor
                  key={member.id}
                  canEdit={isMe || isOwner}
                  member={{
                    id: member.id,
                    displayName: member.displayName,
                    email: member.email,
                    role: member.role,
                    bio: member.bio,
                    jobTitle: member.jobTitle,
                    phone: member.phone,
                    isMe,
                    wpAgentPermalink: member.externalRefs?.wp_agent_permalink as
                      | string
                      | undefined,
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to manage team profiles.</p>
          </div>
        )}

        <div className="dg-card max-w-xl">
          <h2 className="font-semibold text-white">Invites</h2>
          <p className="mt-2 text-sm text-slate-400">
            Invite colleagues via Clerk organisation settings. Once they join, they appear
            here and can fill in their own bio.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Tip: Clerk Dashboard → Organizations → invite members.
          </p>
        </div>
      </main>
    </>
  );
}

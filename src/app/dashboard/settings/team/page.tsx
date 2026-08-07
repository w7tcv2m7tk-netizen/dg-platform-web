import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  listOrganisationMembers,
  syncMembershipFromClerkAccount,
} from "@dg/platform-core";
import { enrichMembersWithClerkAccount } from "@dg/platform-core/org/membership-profile-clerk";

import { TeamInviteForm } from "@/components/platform/TeamInviteForm";
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

  if (session && user?.id) {
    await syncMembershipFromClerkAccount({
      organisationId: session.organisationId,
      clerkUserId: user.id,
      email,
      name,
      imageUrl: user.imageUrl,
    }).catch(() => null);
  }

  const members = session
    ? await enrichMembersWithClerkAccount(
        await listOrganisationMembers(session.organisationId),
      )
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
          Business-facing profiles for this organisation — linked to your Clerk login account
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="dg-card max-w-2xl">
          <h2 className="font-semibold text-white">Account vs team profile</h2>
          <p className="mt-2 text-sm text-slate-400">
            The sidebar Account menu is your Clerk login (email, password, account photo). Team
            profiles are per-business: name, bio, title, phone, and photo used on the website
            agent page. Upload a profile photo on your card below.
          </p>
        </div>

        {session ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
                    avatarUrl: member.avatarUrl,
                    clerkImageUrl: member.clerkImageUrl ?? (isMe ? user?.imageUrl : null),
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
          <h2 className="font-semibold text-white">Invite teammates</h2>
          <p className="mt-2 text-sm text-slate-400">
            Send a Clerk invite email. When they accept and sign in, they join this organisation
            and can edit their own team profile.
          </p>
          <TeamInviteForm canInvite={Boolean(isOwner)} />
        </div>
      </main>
    </>
  );
}

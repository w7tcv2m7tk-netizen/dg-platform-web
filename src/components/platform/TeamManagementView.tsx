import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  listOrganisationMembers,
  syncMembershipFromClerkAccount,
} from "@dg/platform-core";
import { enrichMembersWithClerkAccount } from "@dg/platform-core/org/membership-profile-clerk";

import { TeamInviteForm } from "@/components/platform/TeamInviteForm";
import { TeamProfileEditor } from "@/components/platform/TeamProfileEditor";
import { TeamRoleSelect } from "@/components/platform/TeamRoleSelect";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

type TeamManagementViewProps = {
  /** Controls back-link chrome — Business keeps Core context; Settings keeps Platform. */
  context: "business" | "settings";
};

export async function TeamManagementView({ context }: TeamManagementViewProps) {
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
  const backHref = context === "business" ? "/dashboard/business" : "/dashboard/settings";
  const backLabel = context === "business" ? "← Business Profile" : "← Settings";
  const title = context === "business" ? "Team" : "Team & access";

  return (
    <>
      <header className="dg-page-header">
        <Link href={backHref} className="text-sm text-blue-400 hover:underline">
          {backLabel}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>
        <p className="text-sm text-slate-400">
          Business-facing profiles for this organisation — linked to your Clerk login account
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="dg-card max-w-2xl border-sky-500/20">
          <h2 className="font-semibold text-white">Role clarity</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>
              <span className="font-medium text-slate-200">Organisation Owner:</span> full
              organisation — billing, users, Apps, security. Not platform admin.
            </li>
            <li>
              <span className="font-medium text-slate-200">Organisation Admin:</span>{" "}
              operational management — CRM, Apps, team invites; no ownership transfer.
            </li>
            <li>
              <span className="font-medium text-slate-200">Organisation Member:</span>{" "}
              assigned records and enabled Apps — no billing or user administration by
              default. Granular grants can extend access.
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Permissions are enforced in the API, not only by hiding sidebar items.
          </p>
        </div>

        <div className="dg-card max-w-2xl">
          <h2 className="font-semibold text-white">Account vs team profile</h2>
          <p className="mt-2 text-sm text-slate-400">
            Your team card is per business: photo, name, title, phone, bio, and public email can
            differ for each organisation. Saving a custom photo also updates the sidebar Account
            menu (Clerk). Your login email stays on the Clerk Account — set a different public
            email here when clients should contact a business address.
          </p>
        </div>

        {session ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => {
              const isMe = member.clerkUserId === session.clerkUserId;
              return (
                <div key={member.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="text-xs text-slate-500">Role</span>
                    <TeamRoleSelect
                      membershipId={member.id}
                      role={member.role}
                      disabled={!isOwner || isMe || member.role === "owner"}
                    />
                  </div>
                  <TeamProfileEditor
                    canEdit={isMe || isOwner}
                    canRemove={isOwner && !isMe}
                    member={{
                      id: member.id,
                      displayName: member.displayName,
                      email: member.email,
                      publicEmail: member.publicEmail,
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
                </div>
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
            Owners and admins can invite Member or Admin. If they already have a
            DigitalGate login, they join this business immediately. New people get
            a Clerk email and land in this organisation at the chosen role when
            they first sign in.
          </p>
          <TeamInviteForm canInvite={Boolean(isOwner)} />
        </div>
      </main>
    </>
  );
}

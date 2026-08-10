import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

import { ServicesNav } from "@/components/services/ServicesNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function ServicesTeamsPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
      })
    : null;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Teams</h1>
        <p className="mt-1 text-sm text-slate-400">
          Field staff assignment uses organisation memberships (MVP)
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <ServicesNav active="teams" />
        <div className="dg-card space-y-3">
          <p className="text-sm text-slate-400">
            {session
              ? `${session.organisationName} — manage people under Settings → Team. Job assignment UI expands next.`
              : "Sign in to manage team."}
          </p>
          <Link
            href="/dashboard/settings/team"
            className="inline-block text-sm text-sky-400 hover:underline"
          >
            Open team settings →
          </Link>
        </div>
      </main>
    </>
  );
}

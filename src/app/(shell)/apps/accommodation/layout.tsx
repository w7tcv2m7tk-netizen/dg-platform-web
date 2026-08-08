import { currentUser } from "@clerk/nextjs/server";

import { AccBetaGateMessage } from "@/components/accommodation/AccBetaChecklist";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { checkAccBetaAccess } from "@/lib/acc-beta-access";
import { fetchPortalMe } from "@/lib/dg-api";

/**
 * Gate all /apps/accommodation/* routes behind the acc.beta feature flag.
 */
export default async function AccommodationAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  if (!user?.id || !process.env.DATABASE_URL) {
    return children;
  }

  const portal = email ? await fetchPortalMe(email, user.id) : null;
  const session = await resolveActivePlatformSession({
    clerkUserId: user.id,
    email,
    name,
    orgName: portal?.org_name,
  });

  if (!session) return children;

  const { allowed } = await checkAccBetaAccess(session.organisationId);
  if (allowed) return children;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Accommodation</h1>
        <p className="text-sm text-slate-400">{session.organisationName}</p>
      </header>
      <main className="dg-page-main">
        <AccBetaGateMessage />
      </main>
    </>
  );
}

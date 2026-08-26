import { currentUser } from "@clerk/nextjs/server";
import { organisationHasIndustryAppBeta } from "@dg/platform-core";
import Link from "next/link";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

/**
 * Shared industry beta layout gate — route/direct URL same as nav + API.
 */
export async function IndustryBetaAppLayout({
  appId,
  title,
  children,
}: {
  appId: string;
  title: string;
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

  const allowed = await organisationHasIndustryAppBeta(
    session.organisationId,
    appId,
  );
  if (allowed) return children;

  return (
    <main className="dg-page-main">
      <div className="dg-card space-y-3">
        <p className="font-medium text-white">Closed beta</p>
        <p className="text-sm text-slate-400">
          {title} is enrolled per organisation via feature flags — not open to every customer by
          default. Ask DigitalGate to enable the beta for this workspace.
        </p>
        <p className="text-xs text-slate-500">{session.organisationName}</p>
        <Link href="/dashboard" className="text-sm text-sky-400 hover:underline">
          ← Back to Priorities
        </Link>
      </div>
    </main>
  );
}

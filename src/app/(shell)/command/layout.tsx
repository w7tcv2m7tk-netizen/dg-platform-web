import Link from "next/link";
import { canAccessCommandCentre } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await getPlatformPageContext();

  const allowed =
    session &&
    canAccessCommandCentre({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      organisationSlug: session.organisationSlug,
      role: session.role,
    });

  if (!allowed) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Command Centre</h1>
          <p className="mt-1 text-sm text-slate-400">
            Internal to the DigitalGate organisation only.
          </p>
        </header>
        <main className="dg-page-main">
          <div className="max-w-lg rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-5 text-sm text-amber-50">
            <p className="font-medium text-white">Switch to DigitalGate</p>
            <p className="mt-2 text-amber-100/90">
              Command Centre and Opportunity Engine are only visible when DigitalGate is the
              active organisation. Use the org switcher, then open Command Centre from the
              sidebar.
            </p>
            <Link href="/dashboard" className="mt-4 inline-block text-sky-400 hover:underline">
              ← Back to dashboard
            </Link>
          </div>
        </main>
      </>
    );
  }

  return children;
}

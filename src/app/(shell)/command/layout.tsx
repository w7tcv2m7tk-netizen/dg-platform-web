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
      organisations: session.organisations.map((o) => ({
        organisationId: o.organisationId,
        organisationName: o.organisationName,
        organisationSlug: o.organisationSlug,
      })),
    });

  if (!allowed) {
    const dg = session?.organisations.find(
      (o) =>
        o.organisationSlug === "digitalgate" ||
        o.organisationSlug.startsWith("digitalgate-") ||
        /\bdigitalgate\b/i.test(o.organisationName),
    );
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Command Centre</h1>
          <p className="mt-1 text-sm text-slate-400">
            Internal DigitalGate staff area — Opportunity Engine lives here.
          </p>
        </header>
        <main className="dg-page-main">
          <div className="max-w-lg rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-5 text-sm text-amber-50">
            <p className="font-medium text-white">You need the DigitalGate operator org</p>
            <p className="mt-2 text-amber-100/90">
              Command Centre (and Opportunity Engine / Daily Briefing) is only for DigitalGate
              staff. Switch into the DigitalGate organisation, then open{" "}
              <code className="text-amber-200">/command/growth-engine</code>.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {dg ? (
                <p className="text-xs text-slate-400">
                  Use the org switcher → <span className="text-white">{dg.organisationName}</span>
                </p>
              ) : (
                <p className="text-xs text-rose-200">
                  No DigitalGate membership found on this account.
                </p>
              )}
              <Link href="/dashboard" className="text-sky-400 hover:underline">
                ← Back to dashboard
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return children;
}

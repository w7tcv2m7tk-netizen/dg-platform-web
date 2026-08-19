import Link from "next/link";
import { redirect } from "next/navigation";

import { getPlatformPageContext } from "@/lib/platform-page-context";
import { getPartnerByClerkUserId } from "@dg/platform-core";

const NAV = [
  { href: "/partner/dashboard", label: "Dashboard" },
  { href: "/partner/referrals", label: "Referrals" },
  { href: "/partner/commissions", label: "Commissions" },
  { href: "/partner/resources", label: "Resources" },
  { href: "/partner/profile", label: "Profile" },
];

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { clerkUserId } = await getPlatformPageContext();

  if (!clerkUserId) redirect("/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="dg-page-main">
        <div className="max-w-lg rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-5 text-sm text-amber-50">
          <p className="font-medium text-white">Partner Portal unavailable</p>
          <p className="mt-2 text-amber-100/90">Platform database is not configured.</p>
        </div>
      </div>
    );
  }

  const partner = await getPartnerByClerkUserId(clerkUserId);

  if (!partner) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Partner Portal</h1>
        </header>
        <main className="dg-page-main">
          <div className="max-w-lg rounded-xl border border-slate-700 bg-slate-800/60 px-6 py-6">
            <p className="font-semibold text-white">You are not registered as a DigitalGate partner.</p>
            <p className="mt-2 text-sm text-slate-300">
              If you believe this is an error or you would like to become a partner,{" "}
              <a href="mailto:hello@digitalgate.com.au" className="text-sky-400 hover:underline">
                contact Ben Roe
              </a>.
            </p>
          </div>
        </main>
      </>
    );
  }

  if (partner.status === "suspended" || partner.status === "inactive") {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Partner Portal</h1>
        </header>
        <main className="dg-page-main">
          <div className="max-w-lg rounded-xl border border-amber-500/30 bg-amber-500/5 px-6 py-6 text-sm text-amber-100">
            <p className="font-semibold text-white">Your partner account is {partner.status}.</p>
            <p className="mt-2">
              Please contact{" "}
              <a href="mailto:hello@digitalgate.com.au" className="text-sky-400 hover:underline">
                hello@digitalgate.com.au
              </a>{" "}
              for assistance.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
              DigitalGate Partner Portal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Welcome, {partner.displayName?.split(" ")[0] ?? "Partner"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {partner.partnerTypeLabel} &middot;{" "}
              {partner.commissionPercent}% commission &middot; first{" "}
              {partner.commissionDurationMonths} months
            </p>
          </div>
          {partner.status === "pending" && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              Pending approval
            </span>
          )}
        </div>
        <nav className="mt-5 flex gap-1 border-t border-slate-700/60 pt-4">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="dg-page-main">{children}</main>
    </>
  );
}

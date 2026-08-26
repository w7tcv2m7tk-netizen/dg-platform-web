import Link from "next/link";
import { redirect } from "next/navigation";

import { getPlatformPageContext } from "@/lib/platform-page-context";
import {
  claimPartnerInvitation,
  FOUNDING_RESELLER_TERMS_VERSION,
  getPartnerByClerkUserId,
} from "@dg/platform-core";

/**
 * Partner portal auth + status gates only.
 * Section nav is owned by AppContextNav (sidebar app + horizontal subnav).
 */
export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { clerkUserId, email } = await getPlatformPageContext();

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

  const partner =
    (await getPartnerByClerkUserId(clerkUserId)) ||
    (await claimPartnerInvitation({ clerkUserId, email }));

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
              </a>
              .
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
      {partner.partnerType !== "IMPLEMENTATION_PARTNER" &&
      (!partner.termsAcceptedAt || partner.termsVersion !== FOUNDING_RESELLER_TERMS_VERSION) ? (
        <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100 sm:px-6 md:px-8">
          Please{" "}
          <Link href="/partner/terms" className="font-medium text-sky-300 hover:underline">
            review and accept programme terms
          </Link>{" "}
          so we have a record of your participation rules.
        </div>
      ) : null}
      <main className="dg-page-main">{children}</main>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { listOrganisationPaymentRequests } from "@dg/platform-core";

import { CommercePaymentsList } from "@/components/commerce/CommercePaymentsList";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function CommercePaymentsPage() {
  const session = await getAuthorisedPlatformPageSession("commerce.read");
  if (!session) notFound();

  const payments = await listOrganisationPaymentRequests(session.organisationId);

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/commerce"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Commerce
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Payments</h1>
        <p className="text-sm text-slate-400">
          Stripe checkout links and payment request history for this business
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommercePaymentsList items={payments} />
        <Link
          href="/apps/re/vendor-leads"
          className="inline-block text-sm text-blue-400 hover:underline"
        >
          Create from vendor leads →
        </Link>
      </main>
    </>
  );
}

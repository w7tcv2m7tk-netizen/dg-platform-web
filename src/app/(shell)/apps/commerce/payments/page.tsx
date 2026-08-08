import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import { listOrganisationPaymentRequests } from "@dg/platform-core";

import { CommercePaymentsList } from "@/components/commerce/CommercePaymentsList";
import { CommerceStripeSetup } from "@/components/commerce/CommerceStripeSetup";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function CommercePaymentsPage() {
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

  const payments = session
    ? await listOrganisationPaymentRequests(session.organisationId)
    : [];

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
        <CommerceStripeSetup />
        <CommercePaymentsList items={payments} />
        {session ? (
          <Link
            href="/apps/re/vendor-leads"
            className="inline-block text-sm text-blue-400 hover:underline"
          >
            Create from vendor leads →
          </Link>
        ) : null}
      </main>
    </>
  );
}

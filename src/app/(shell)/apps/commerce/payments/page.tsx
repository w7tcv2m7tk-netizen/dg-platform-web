import Link from "next/link";
import { SectionPageHeader } from "@/components/ui/SectionPageHeader";
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
      <SectionPageHeader section="Commerce" title="Payments" />
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

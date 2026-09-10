import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBusinessContext,
  getContact,
  getInvoice,
  sessionHasFeature,
  type CommerceBuyerDetails,
  type CommerceLineItem,
} from "@dg/platform-core";

import {
  MarkInvoicePaidButton,
  PrintDocumentButton,
  SendInvoiceButton,
  VoidInvoiceButton,
} from "@/components/commerce/CommerceDocumentActions";
import { CommerceDocumentView } from "@/components/commerce/CommerceDocumentView";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAuthorisedPlatformPageSession("commerce.read");
  if (!session) notFound();

  const canManage = sessionHasFeature(session, "commerce.manage");
  const canReadContacts = sessionHasFeature(session, "crm.contacts.read");

  const invoice = await getInvoice(session.organisationId, id);
  if (!invoice) notFound();

  const [business, contact] = await Promise.all([
    getBusinessContext({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      locale: "en-AU",
      currency: invoice.currency,
    }),
    canReadContacts && invoice.contactId
      ? getContact(session.organisationId, invoice.contactId)
      : Promise.resolve(null),
  ]);

  const meta = (invoice.metadata ?? {}) as Record<string, unknown>;
  const buyer = (meta.buyer as CommerceBuyerDetails | undefined) ?? null;
  const taxInclusive = Boolean(meta.taxInclusive);
  const lineItems = invoice.lineItems as unknown as CommerceLineItem[];

  return (
    <>
      <header className="dg-page-header print:hidden">
        <Link
          href="/apps/commerce/invoices"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Invoices
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {invoice.invoiceNumber ?? "Invoice"}
            </h1>
            <p className="text-sm capitalize text-slate-400">
              {invoice.status.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrintDocumentButton />
            {canManage ? (
              <>
                <SendInvoiceButton invoiceId={invoice.id} status={invoice.status} />
                <MarkInvoicePaidButton invoiceId={invoice.id} status={invoice.status} />
                <VoidInvoiceButton invoiceId={invoice.id} status={invoice.status} />
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main className="flex-1 space-y-6 p-4 sm:p-8 print:p-0">
        <CommerceDocumentView
          kind="invoice"
          documentNumber={invoice.invoiceNumber}
          status={invoice.status}
          issuedAt={invoice.createdAt}
          dueAt={invoice.dueAt}
          currency={invoice.currency}
          subtotalCents={invoice.subtotalCents}
          taxCents={invoice.taxCents}
          totalCents={invoice.totalCents}
          lineItems={lineItems}
          notes={invoice.notes}
          taxInclusive={taxInclusive}
          buyer={buyer}
          contact={
            contact
              ? {
                  name: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
                  email: contact.email,
                  phone: contact.phone,
                }
              : null
          }
          business={business}
        />
      </main>
    </>
  );
}

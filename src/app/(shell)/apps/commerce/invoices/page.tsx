import Link from "next/link";
import {
  getOrganisationBusinessProfile,
  listInvoices,
  resolveOrgTaxDefaults,
  sessionHasFeature,
} from "@dg/platform-core";

import { CreateDocumentForm } from "@/components/commerce/CreateDocumentForm";
import { SendInvoiceButton } from "@/components/commerce/CommerceDocumentActions";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
}

export default async function CommerceInvoicesPage() {
  const session = await getAuthorisedPlatformPageSession("commerce.read");
  if (!session) return null;
  const canManage = sessionHasFeature(session, "commerce.manage");

  const [invoices, profile] = await Promise.all([
    listInvoices(session.organisationId),
    getOrganisationBusinessProfile(session.organisationId),
  ]);
  const taxDefaults = resolveOrgTaxDefaults(profile);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/commerce" className="text-sm text-blue-400 hover:underline">← Commerce</Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Invoices</h1>
        <p className="text-sm text-slate-400">{invoices.length} invoice(s) · AU tax invoice layout from Business Profile</p>
      </header>
      <main className="dg-page-main space-y-6">
        {canManage ? (
          <CreateDocumentForm
            kind="invoice"
            defaultTaxInclusive={taxDefaults.pricesIncludeTax}
            defaultApplyGst={taxDefaults.defaultTaxRateBps > 0}
          />
        ) : (
          <div className="dg-card text-sm text-slate-400">You have read-only access to Commerce.</div>
        )}
        <div className="dg-card dg-table-scroll !p-0 sm:!p-6">
          <div className="p-4 sm:p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Number</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Total</th>
                  <th className="py-2 pr-4 font-medium">GST</th>
                  <th className="py-2 font-medium">Due</th>
                  {canManage ? <th className="py-2 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-800/60">
                    <td className="py-3 pr-4">
                      <Link href={`/apps/commerce/invoices/${invoice.id}`} className="font-medium text-blue-400 hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 capitalize text-slate-300">{invoice.status.replace(/_/g, " ")}</td>
                    <td className="py-3 pr-4 text-slate-300">{formatMoney(invoice.totalCents)}</td>
                    <td className="py-3 pr-4 text-slate-400">{formatMoney(invoice.taxCents)}</td>
                    <td className="py-3 text-slate-400">{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("en-AU") : "—"}</td>
                    {canManage ? (
                      <td className="py-3"><SendInvoiceButton invoiceId={invoice.id} status={invoice.status} /></td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            {!invoices.length ? <p className="py-6 text-center text-sm text-slate-400">No invoices yet.</p> : null}
          </div>
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import { listInvoices,} from "@dg/platform-core";

import { CreateDocumentForm } from "@/components/commerce/CreateDocumentForm";
import { SendInvoiceButton } from "@/components/commerce/CommerceDocumentActions";
import { fetchPortalMe } from "@/lib/dg-api";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export default async function CommerceInvoicesPage() {
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

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
        </header>
        <main className="dg-page-main">
          <div className="dg-card">
            <p className="text-slate-300">Database not configured.</p>
          </div>
        </main>
      </>
    );
  }

  const invoices = await listInvoices(session.organisationId);

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/commerce"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Commerce
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Invoices</h1>
        <p className="text-sm text-slate-400">{invoices.length} invoice(s)</p>
      </header>
      <main className="flex-1 space-y-6 p-8">
        <CreateDocumentForm kind="invoice" />
        <div className="dg-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4 font-medium">Number</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Total</th>
                <th className="py-2 font-medium">Due</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-slate-800/60">
                  <td className="py-3 pr-4 text-white">{invoice.invoiceNumber}</td>
                  <td className="py-3 pr-4 text-slate-300">{invoice.status}</td>
                  <td className="py-3 pr-4 text-slate-300">
                    {formatMoney(invoice.totalCents)}
                  </td>
                  <td className="py-3 text-slate-400">
                    {invoice.dueAt
                      ? new Date(invoice.dueAt).toLocaleDateString("en-AU")
                      : "—"}
                  </td>
                  <td className="py-3">
                    <SendInvoiceButton invoiceId={invoice.id} status={invoice.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!invoices.length ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No invoices yet — accept a quote or create via API.
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}

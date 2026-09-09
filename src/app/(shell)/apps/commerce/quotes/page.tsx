import Link from "next/link";
import {
  getOrganisationBusinessProfile,
  listQuotes,
  resolveOrgTaxDefaults,
  sessionHasFeature,
} from "@dg/platform-core";

import { CreateDocumentForm } from "@/components/commerce/CreateDocumentForm";
import {
  AcceptQuoteButton,
  SendQuoteButton,
} from "@/components/commerce/CommerceDocumentActions";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export default async function CommerceQuotesPage() {
  const session = await getAuthorisedPlatformPageSession("commerce.read");
  if (!session) return null;
  const canManage = sessionHasFeature(session, "commerce.manage");

  const [quotes, profile] = await Promise.all([
    listQuotes(session.organisationId),
    getOrganisationBusinessProfile(session.organisationId),
  ]);
  const taxDefaults = resolveOrgTaxDefaults(profile);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/commerce" className="text-sm text-blue-400 hover:underline">
          ← Commerce
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Quotes</h1>
        <p className="text-sm text-slate-400">
          {quotes.length} quote(s) · convert accepted quotes to invoices
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {canManage ? (
          <CreateDocumentForm
            kind="quote"
            defaultTaxInclusive={taxDefaults.pricesIncludeTax}
            defaultApplyGst={taxDefaults.defaultTaxRateBps > 0}
          />
        ) : (
          <div className="dg-card text-sm text-slate-400">You have read-only access to Commerce.</div>
        )}
        <div className="dg-card dg-table-scroll">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4 font-medium">Number</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Total</th>
                <th className="py-2 font-medium">Created</th>
                {canManage ? <th className="py-2 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-b border-slate-800/60">
                  <td className="py-3 pr-4">
                    <Link href={`/apps/commerce/quotes/${quote.id}`} className="font-medium text-blue-400 hover:underline">
                      {quote.quoteNumber}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 capitalize text-slate-300">{quote.status.replace(/_/g, " ")}</td>
                  <td className="py-3 pr-4 text-slate-300">{formatMoney(quote.totalCents)}</td>
                  <td className="py-3 text-slate-400">{new Date(quote.createdAt).toLocaleDateString("en-AU")}</td>
                  {canManage ? (
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <SendQuoteButton quoteId={quote.id} status={quote.status} />
                        <AcceptQuoteButton
                          quoteId={quote.id}
                          disabled={!["draft", "sent", "viewed"].includes(quote.status)}
                          redirectOnSuccess={false}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {!quotes.length ? (
            <p className="py-6 text-center text-sm text-slate-400">No quotes yet.</p>
          ) : null}
        </div>
      </main>
    </>
  );
}

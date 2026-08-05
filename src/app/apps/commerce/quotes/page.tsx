import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { listQuotes, resolvePlatformSession } from "@dg/platform-core";

import { CreateDocumentForm } from "@/components/commerce/CreateDocumentForm";
import { fetchPortalMe } from "@/lib/dg-api";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export default async function CommerceQuotesPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolvePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  if (!session) {
    return (
      <>
        <header className="border-b border-slate-800 px-8 py-5">
          <h1 className="text-2xl font-bold text-white">Quotes</h1>
        </header>
        <main className="flex-1 p-8">
          <div className="dg-card">
            <p className="text-slate-300">Database not configured.</p>
          </div>
        </main>
      </>
    );
  }

  const quotes = await listQuotes(session.organisationId);

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <Link
          href="/apps/commerce"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Commerce
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Quotes</h1>
        <p className="text-sm text-slate-400">{quotes.length} quote(s)</p>
      </header>
      <main className="flex-1 space-y-6 p-8">
        <CreateDocumentForm kind="quote" />
        <div className="dg-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4 font-medium">Number</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Total</th>
                <th className="py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-b border-slate-800/60">
                  <td className="py-3 pr-4 text-white">{quote.quoteNumber}</td>
                  <td className="py-3 pr-4 text-slate-300">{quote.status}</td>
                  <td className="py-3 pr-4 text-slate-300">
                    {formatMoney(quote.totalCents)}
                  </td>
                  <td className="py-3 text-slate-400">
                    {new Date(quote.createdAt).toLocaleDateString("en-AU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!quotes.length ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No quotes yet — create via API or RE workflows.
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}

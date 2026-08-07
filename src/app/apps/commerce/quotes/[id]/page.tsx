import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import {
  getBusinessContext,
  getContact,
  getQuote,
  type CommerceBuyerDetails,
  type CommerceLineItem,
} from "@dg/platform-core";

import {
  AcceptQuoteButton,
  DeclineQuoteButton,
  PrintDocumentButton,
  SendQuoteButton,
} from "@/components/commerce/CommerceDocumentActions";
import { CommerceDocumentView } from "@/components/commerce/CommerceDocumentView";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      <main className="dg-page-main">
        <p className="text-slate-300">Database not configured.</p>
      </main>
    );
  }

  const quote = await getQuote(session.organisationId, id);
  if (!quote) notFound();

  const [business, contact] = await Promise.all([
    getBusinessContext({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      locale: "en-AU",
      currency: quote.currency,
    }),
    quote.contactId
      ? getContact(session.organisationId, quote.contactId)
      : Promise.resolve(null),
  ]);

  const meta = (quote.metadata ?? {}) as Record<string, unknown>;
  const buyer = (meta.buyer as CommerceBuyerDetails | undefined) ?? null;
  const taxInclusive = Boolean(meta.taxInclusive);
  const lineItems = quote.lineItems as unknown as CommerceLineItem[];
  const canConvert = ["draft", "sent", "viewed"].includes(quote.status);

  return (
    <>
      <header className="dg-page-header print:hidden">
        <Link
          href="/apps/commerce/quotes"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Quotes
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {quote.quoteNumber ?? "Quote"}
            </h1>
            <p className="text-sm capitalize text-slate-400">
              {quote.status.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrintDocumentButton />
            <SendQuoteButton quoteId={quote.id} status={quote.status} />
            <AcceptQuoteButton quoteId={quote.id} disabled={!canConvert} />
            <DeclineQuoteButton quoteId={quote.id} status={quote.status} />
          </div>
        </div>
      </header>
      <main className="flex-1 space-y-6 p-4 sm:p-8 print:p-0">
        <CommerceDocumentView
          kind="quote"
          documentNumber={quote.quoteNumber}
          status={quote.status}
          issuedAt={quote.createdAt}
          validUntil={quote.validUntil}
          currency={quote.currency}
          subtotalCents={quote.subtotalCents}
          taxCents={quote.taxCents}
          totalCents={quote.totalCents}
          lineItems={lineItems}
          notes={quote.notes}
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PropertyOffersPanel({
  propertyId,
  offers,
  buyerLeads = [],
}: {
  propertyId: string;
  offers: Array<{
    id: string;
    buyerLeadId?: string;
    buyerName?: string;
    amountCents: number;
    status: string;
    conditions?: string;
    submittedAt?: string;
  }>;
  buyerLeads?: Array<{ id: string; title: string | null; stage?: string }>;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerLeadId, setBuyerLeadId] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function createOffer(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount.replace(/[^0-9.]/g, "")) * 100);
    if (!cents) return;

    const selected = buyerLeads.find((b) => b.id === buyerLeadId);
    setPending("create");
    await fetch("/api/v1/re/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId,
        amountCents: cents,
        buyerName: buyerName || selected?.title || undefined,
        buyerLeadId: buyerLeadId || undefined,
      }),
    });
    setPending(null);
    setAmount("");
    setBuyerName("");
    setBuyerLeadId("");
    router.refresh();
  }

  async function setOfferStatus(offerId: string, status: "accepted" | "rejected" | "withdrawn") {
    setPending(offerId);
    await fetch("/api/v1/re/offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, offerId, status }),
    });
    setPending(null);
    router.refresh();
  }

  return (
    <div className="dg-card">
      <h2 className="font-semibold text-white">Offers</h2>
      <p className="mt-1 text-sm text-slate-400">
        Link a buyer lead when recording an offer — accepting moves property to under offer and
        vendor lead to sale.
      </p>

      {offers.length ? (
        <ul className="mt-4 space-y-3">
          {offers.map((offer) => (
            <li
              key={offer.id}
              className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">
                    ${(offer.amountCents / 100).toLocaleString("en-AU")}
                    {offer.buyerName ? ` · ${offer.buyerName}` : ""}
                  </p>
                  <p className="text-xs capitalize text-slate-500">{offer.status}</p>
                  {offer.buyerLeadId ? (
                    <Link
                      href={`/apps/re/buyer-leads/${offer.buyerLeadId}`}
                      className="mt-1 inline-block text-xs text-blue-400 hover:underline"
                    >
                      Buyer lead →
                    </Link>
                  ) : null}
                  {offer.conditions ? (
                    <p className="mt-1 text-xs text-slate-400">{offer.conditions}</p>
                  ) : null}
                </div>
                {offer.status === "submitted" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending === offer.id}
                      onClick={() => setOfferStatus(offer.id, "accepted")}
                      className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={pending === offer.id}
                      onClick={() => setOfferStatus(offer.id, "rejected")}
                      className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:border-rose-500 hover:text-rose-300 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No offers recorded yet.</p>
      )}

      <form onSubmit={createOffer} className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Offer amount ($)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        {buyerLeads.length ? (
          <select
            value={buyerLeadId}
            onChange={(e) => {
              setBuyerLeadId(e.target.value);
              const selected = buyerLeads.find((b) => b.id === e.target.value);
              if (selected?.title && !buyerName) setBuyerName(selected.title);
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="">Buyer lead (optional)</option>
            {buyerLeads.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title || b.id}
                {b.stage ? ` · ${b.stage}` : ""}
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="text"
          placeholder="Buyer name"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <button
          type="submit"
          disabled={pending === "create"}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Add offer
        </button>
      </form>
    </div>
  );
}

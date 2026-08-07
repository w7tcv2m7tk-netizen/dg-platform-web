"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function formatPrice(cents: number | null | undefined) {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-AU")}`;
}

export function ListingList({
  properties,
}: {
  properties: Array<{
    id: string;
    addressLine1: string;
    suburb: string;
    state: string;
    postcode: string;
    status: string;
    listingPriceCents?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    metadata?: Record<string, unknown> | null;
    leadId?: string | null;
    updatedAt: string;
  }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function updatePrice(propertyId: string, dollars: string) {
    const parsed = Math.round(parseFloat(dollars.replace(/[^0-9.]/g, "")) * 100);
    if (Number.isNaN(parsed)) return;

    setPending(propertyId);
    await fetch(`/api/v1/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingPriceCents: parsed }),
    });
    setPending(null);
    router.refresh();
  }

  if (!properties.length) {
    return (
      <div className="dg-card border-dashed border-slate-700">
        <p className="text-slate-300">No active listings yet.</p>
        <p className="mt-2 text-sm text-slate-500">
          Move a property to <strong className="text-slate-400">Listed</strong> on the Properties
          page, or advance a vendor lead to the Listing stage.
        </p>
        <Link
          href="/apps/re/properties"
          className="mt-4 inline-block text-sm text-blue-400 hover:underline"
        >
          Open properties →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {properties.map((property) => {
        const marketing = (property.metadata?.marketing as Record<string, unknown> | undefined) ?? {};
        const campaign = marketing.campaign as string | undefined;
        const portalUrl = marketing.portal_url as string | undefined;

        return (
          <li
            key={property.id}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 gap-3">
                {Array.isArray(property.metadata?.images) &&
                (property.metadata.images as string[])[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(property.metadata.images as string[])[0]}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                <Link
                  href={`/apps/re/properties/${property.id}`}
                  className="text-lg font-medium text-white hover:underline"
                >
                  {property.addressLine1}
                </Link>
                <p className="text-sm text-slate-400">
                  {property.suburb} {property.state} {property.postcode}
                </p>
                <p className="mt-1 text-xs capitalize text-slate-500">
                  {property.status.replace(/_/g, " ")}
                  {property.bedrooms != null ? ` · ${property.bedrooms} bed` : ""}
                  {property.bathrooms != null ? ` · ${property.bathrooms} bath` : ""}
                </p>
                {campaign ? (
                  <p className="mt-1 text-xs text-emerald-400/90">Campaign: {campaign}</p>
                ) : null}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-slate-500">Guide price</p>
                <p className="text-xl font-bold text-white">
                  {formatPrice(property.listingPriceCents)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm text-slate-400">
                Update guide ($)
                <input
                  type="text"
                  defaultValue={
                    property.listingPriceCents != null
                      ? String(property.listingPriceCents / 100)
                      : ""
                  }
                  disabled={pending === property.id}
                  onBlur={(e) => {
                    if (e.target.value.trim()) updatePrice(property.id, e.target.value);
                  }}
                  className="mt-1 block w-32 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                  placeholder="850000"
                />
              </label>
              {portalUrl ? (
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline"
                >
                  View on portal ↗
                </a>
              ) : null}
              {property.leadId ? (
                <Link
                  href={`/apps/re/vendor-leads/${property.leadId}`}
                  className="text-sm text-blue-400 hover:underline"
                >
                  Vendor lead →
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

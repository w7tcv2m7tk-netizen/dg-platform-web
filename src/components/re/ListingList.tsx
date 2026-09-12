"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  PROPERTY_LISTING_STATUS_OPTIONS,
  PROPERTY_STATUS_LABELS,
} from "@dg/platform-core/properties/statuses";

function formatPrice(
  cents: number | null | undefined,
  locale: string,
  currency: string,
) {
  if (cents == null) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPublicPrice(
  cents: number | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
  locale: string,
  currency: string,
) {
  if (metadata?.display_as_contact_agent === true) return "Contact Agent";
  return formatPrice(cents, locale, currency);
}

export function ListingList({
  properties,
  canManage = false,
  locale = "en-AU",
  currency = "AUD",
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
  canManage?: boolean;
  locale?: string;
  currency?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function updatePrice(propertyId: string, dollars: string) {
    if (!canManage) return;
    const parsed = Math.round(parseFloat(dollars.replace(/[^0-9.]/g, "")) * 100);
    if (Number.isNaN(parsed)) return;

    setPending(propertyId);
    const res = await fetch(`/api/v1/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingPriceCents: parsed }),
    });
    setPending(null);
    if (res.ok) router.refresh();
  }

  async function updateStatus(propertyId: string, status: string) {
    if (!canManage) return;
    setPending(propertyId);
    const res = await fetch(`/api/v1/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPending(null);
    if (res.ok) router.refresh();
  }

  if (!properties.length) {
    return (
      <div className="dg-card border-dashed border-slate-700">
        <h2 className="text-lg font-semibold text-white">No active listings yet</h2>
        <p className="mt-2 text-sm text-slate-400">
          {canManage
            ? "Move a property to Listed on the Properties page, or advance a vendor lead to the Listing stage."
            : "Active property listings will appear here."}
        </p>
        <Link
          href="/apps/re/properties"
          className="mt-4 inline-flex min-h-11 items-center text-sm text-blue-400 hover:underline"
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
        const inspectionTimes =
          typeof property.metadata?.inspection_times === "string"
            ? property.metadata.inspection_times
            : null;

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
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/apps/re/properties/${property.id}`}
                      className="inline-flex min-h-11 items-center text-lg font-medium text-white hover:underline"
                    >
                      {property.addressLine1}
                    </Link>
                    {property.metadata?.website_hidden === true ? (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">
                        Hidden from website
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-400">
                    {property.suburb} {property.state} {property.postcode}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {PROPERTY_STATUS_LABELS[
                      property.status as keyof typeof PROPERTY_STATUS_LABELS
                    ] ?? property.status.replace(/_/g, " ")}
                    {property.bedrooms != null ? ` · ${property.bedrooms} bed` : ""}
                    {property.bathrooms != null ? ` · ${property.bathrooms} bath` : ""}
                  </p>
                  {inspectionTimes ? (
                    <p className="mt-1 text-xs text-slate-400">Inspections: {inspectionTimes}</p>
                  ) : null}
                  {campaign ? (
                    <p className="mt-1 text-xs text-emerald-400/90">Campaign: {campaign}</p>
                  ) : null}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-slate-500">
                  {property.metadata?.display_as_contact_agent === true
                    ? "Public price"
                    : "Guide price"}
                </p>
                <p className="text-xl font-bold text-white">
                  {formatPublicPrice(property.listingPriceCents, property.metadata, locale, currency)}
                </p>
                {property.metadata?.display_as_contact_agent === true &&
                property.listingPriceCents != null ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Guide {formatPrice(property.listingPriceCents, locale, currency)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              {canManage ? (
                <>
                  <label className="text-sm text-slate-400">
                    Status
                    <select
                      value={
                        PROPERTY_LISTING_STATUS_OPTIONS.some((o) => o.value === property.status)
                          ? property.status
                          : "listed"
                      }
                      disabled={pending === property.id}
                      onChange={(e) => void updateStatus(property.id, e.target.value)}
                      className="mt-1 block min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-white"
                    >
                      {PROPERTY_LISTING_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-400">
                    Update guide ({currency})
                    <input
                      type="text"
                      defaultValue={
                        property.listingPriceCents != null
                          ? String(property.listingPriceCents / 100)
                          : ""
                      }
                      disabled={pending === property.id}
                      onBlur={(e) => {
                        if (e.target.value.trim()) void updatePrice(property.id, e.target.value);
                      }}
                      className="mt-1 block min-h-11 w-32 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-white"
                      placeholder="850000"
                    />
                  </label>
                </>
              ) : null}
              {portalUrl ? (
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-sm text-blue-400 hover:underline"
                >
                  View on portal ↗
                </a>
              ) : null}
              {property.leadId ? (
                <Link
                  href={`/apps/re/vendor-leads/${property.leadId}`}
                  className="inline-flex min-h-11 items-center text-sm text-blue-400 hover:underline"
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

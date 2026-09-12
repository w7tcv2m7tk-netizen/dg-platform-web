"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_OPTIONS,
} from "@dg/platform-core/properties/statuses";

function isHiddenFromWebsite(metadata?: Record<string, unknown> | null) {
  return metadata?.website_hidden === true;
}

const FILTERS = [
  "all",
  "appraisal",
  "listed",
  "under_offer",
  "contract_signed",
  "unconditional",
  "sold",
  "hidden",
] as const;

export function PropertyList({
  properties,
  canManage = false,
}: {
  properties: Array<{
    id: string;
    addressLine1: string;
    suburb: string;
    state: string;
    postcode: string;
    status: string;
    leadId?: string | null;
    updatedAt: string;
    metadata?: Record<string, unknown> | null;
  }>;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [pending, setPending] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? properties
      : filter === "hidden"
        ? properties.filter((p) => isHiddenFromWebsite(p.metadata))
        : properties.filter((p) => p.status === filter);

  async function onStatusChange(propertyId: string, status: string) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`min-h-11 rounded-full px-4 py-2 text-sm ${
              filter === status
                ? "bg-blue-600 text-white"
                : "border border-slate-700 text-slate-300 hover:bg-slate-900"
            }`}
          >
            {status === "all"
              ? "All"
              : status === "hidden"
                ? "Hidden"
                : (PROPERTY_STATUS_LABELS[
                    status as keyof typeof PROPERTY_STATUS_LABELS
                  ] ?? status)}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="dg-card border-dashed border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            {properties.length === 0
              ? canManage
                ? "Start your first appraisal"
                : "No properties yet"
              : "No properties in this filter"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {properties.length === 0 ? (
              canManage ? (
                <>
                  Open a{" "}
                  <Link
                    href="/apps/re/vendor-leads"
                    className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
                  >
                    vendor lead
                  </Link>{" "}
                  and start an appraisal to create the property record you’ll list and settle from.
                </>
              ) : (
                "Properties will appear here when they are added to the organisation."
              )
            ) : (
              "Try another status filter, or open All."
            )}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((property) => {
            const hidden = isHiddenFromWebsite(property.metadata);
            return (
              <li
                key={property.id}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/apps/re/properties/${property.id}`}
                        className="inline-flex min-h-11 items-center font-medium text-white hover:underline"
                      >
                        {property.addressLine1}
                      </Link>
                      {hidden ? (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">
                          Hidden
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-400">
                      {property.suburb} {property.state} {property.postcode}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Updated {new Date(property.updatedAt).toLocaleDateString("en-AU")}
                    </p>
                  </div>
                  {canManage ? (
                    <select
                      className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200"
                      value={property.status}
                      disabled={pending === property.id}
                      onChange={(e) => void onStatusChange(property.id, e.target.value)}
                    >
                      {PROPERTY_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {PROPERTY_STATUS_LABELS[
                        property.status as keyof typeof PROPERTY_STATUS_LABELS
                      ] ?? property.status}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

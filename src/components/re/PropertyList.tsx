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
    setPending(propertyId);
    await fetch(`/api/v1/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPending(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded-full px-4 py-1.5 text-sm ${
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
              ? "Start your first appraisal"
              : "No properties in this filter"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {properties.length === 0 ? (
              <>
                Open a{" "}
                <Link href="/apps/re/vendor-leads" className="text-sky-400 hover:underline">
                  vendor lead
                </Link>{" "}
                and use <span className="text-slate-300">Start appraisal</span> — that creates the
                property record you’ll list and settle from.
              </>
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
                    className="font-medium text-white hover:underline"
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
                <select
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
                  value={property.status}
                  disabled={pending === property.id}
                  onChange={(e) => onStatusChange(property.id, e.target.value)}
                >
                  {PROPERTY_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

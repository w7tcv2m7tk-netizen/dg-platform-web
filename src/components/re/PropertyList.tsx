"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  prospect: "Prospect",
  appraisal: "Appraisal",
  listed: "Listed",
  under_offer: "Under offer",
  sold: "Sold",
  withdrawn: "Withdrawn",
};

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
  }>;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [pending, setPending] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? properties
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
        {["all", "appraisal", "listed", "under_offer", "sold"].map((status) => (
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
            {status === "all" ? "All" : (STATUS_LABELS[status] ?? status)}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <p className="text-sm text-slate-400">
          No properties yet. Start an appraisal from a vendor lead.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((property) => (
            <li
              key={property.id}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/apps/re/properties/${property.id}`}
                    className="font-medium text-white hover:underline"
                  >
                    {property.addressLine1}
                  </Link>
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
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

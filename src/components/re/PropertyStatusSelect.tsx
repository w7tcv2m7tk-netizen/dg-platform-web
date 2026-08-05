"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = [
  { id: "prospect", label: "Prospect" },
  { id: "appraisal", label: "Appraisal" },
  { id: "listed", label: "Listed" },
  { id: "under_offer", label: "Under offer" },
  { id: "sold", label: "Sold" },
  { id: "withdrawn", label: "Withdrawn" },
] as const;

export function PropertyStatusSelect({
  propertyId,
  currentStatus,
}: {
  propertyId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onChange(status: string) {
    setPending(true);
    await fetch(`/api/v1/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <select
      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
      value={currentStatus}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
    >
      {STATUSES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

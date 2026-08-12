"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PROPERTY_STATUS_OPTIONS } from "@dg/platform-core/properties/statuses";

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
      {PROPERTY_STATUS_OPTIONS.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

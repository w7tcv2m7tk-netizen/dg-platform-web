"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TeamRoleSelect({
  membershipId,
  role,
  disabled,
}: {
  membershipId: string;
  role: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(role === "admin" ? "admin" : "member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (role === "owner" || role === "dg:staff") {
    return (
      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-300">
        {role === "owner" ? "Owner" : "Staff"}
      </span>
    );
  }

  if (disabled) {
    return (
      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {value}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
        value={value}
        disabled={saving}
        onChange={(e) => {
          const next = e.target.value as "admin" | "member";
          setValue(next);
          setSaving(true);
          setError(null);
          void fetch("/api/v1/org/team", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membershipId, role: next }),
          })
            .then(async (res) => {
              const json = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(json?.error?.message ?? "Could not update role");
                setValue(role === "admin" ? "admin" : "member");
                return;
              }
              router.refresh();
            })
            .finally(() => setSaving(false));
        }}
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      {error ? <p className="text-[11px] text-rose-400">{error}</p> : null}
    </div>
  );
}

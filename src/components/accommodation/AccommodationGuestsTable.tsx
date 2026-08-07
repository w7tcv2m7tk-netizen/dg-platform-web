"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { WpAccGuestRow } from "@/lib/dg-api";

export function AccommodationGuestsTable({
  guests,
  error,
  total,
  siteLabel,
}: {
  guests: WpAccGuestRow[];
  error?: string;
  total?: number;
  siteLabel?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(guests);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">
          Deploy plugin v10.58.0+ on CVH to enable guest editing.
        </p>
      </div>
    );
  }

  function patchRow(id: number, patch: Partial<WpAccGuestRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRow(row: WpAccGuestRow) {
    setPending(true);
    setMessage(null);
    setSaveError(null);
    const res = await fetch("/api/v1/accommodation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "guests",
        updates: [
          {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
          },
        ],
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setSaveError(
        json.error?.message ??
          "Could not save guest — deploy DG Platform plugin v10.58.0+ on CVH.",
      );
      return;
    }
    setEditingId(null);
    setMessage(`Saved ${row.name ?? "guest"}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {siteLabel || total != null ? (
        <p className="text-sm text-slate-500">
          {siteLabel ? `${siteLabel}` : ""}
          {total != null ? ` · ${total} guests in WordPress` : ""}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {saveError ? <p className="text-sm text-amber-400">{saveError}</p> : null}

      {!rows.length ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-300">No guests returned.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Stays</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((g) => {
                const editing = editingId === g.id;
                return (
                  <tr key={g.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          value={g.name ?? ""}
                          onChange={(e) => patchRow(g.id, { name: e.target.value })}
                          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                        />
                      ) : (
                        <span className="font-medium text-white">{g.name ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          type="email"
                          value={g.email ?? ""}
                          onChange={(e) => patchRow(g.id, { email: e.target.value })}
                          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                        />
                      ) : (
                        <span className="text-slate-400">{g.email ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          value={g.phone ?? ""}
                          onChange={(e) => patchRow(g.id, { phone: e.target.value })}
                          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                        />
                      ) : (
                        <span className="text-slate-400">{g.phone ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{g.total_stays ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      {editing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => void saveRow(g)}
                            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRows(guests);
                              setEditingId(null);
                            }}
                            className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingId(g.id)}
                          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-white"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

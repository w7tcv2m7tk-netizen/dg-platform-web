"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type SignatureRow = {
  id: string;
  name: string;
  html: string;
  isDefault: boolean;
  replyHtml?: string;
  updatedAt: string;
};

export function SignatureStudio({ initial }: { initial: SignatureRow[] }) {
  const router = useRouter();
  const [signatures, setSignatures] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [html, setHtml] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = useMemo(
    () => (editingId ? signatures.find((s) => s.id === editingId) : null),
    [editingId, signatures],
  );

  function startCreate() {
    setEditingId(null);
    setName("");
    setHtml(
      "<p>Kind regards,<br/><strong>Your Name</strong><br/>Your Business<br/><a href=\"https://example.com\">example.com</a></p>",
    );
    setIsDefault(signatures.length === 0);
    setError(null);
  }

  function startEdit(row: SignatureRow) {
    setEditingId(row.id);
    setName(row.name);
    setHtml(row.html);
    setIsDefault(row.isDefault);
    setError(null);
  }

  async function save() {
    setPending(true);
    setError(null);
    const payload = { name: name.trim(), html, isDefault };
    const res = await fetch("/api/v1/communications/signatures", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json?.error?.message ?? `Save failed (${res.status})`);
      return;
    }
    setSignatures(json?.data?.signatures ?? []);
    setEditingId(null);
    setName("");
    setHtml("");
    setIsDefault(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this signature?")) return;
    setPending(true);
    setError(null);
    const res = await fetch(`/api/v1/communications/signatures?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json?.error?.message ?? `Delete failed (${res.status})`);
      return;
    }
    setSignatures(json?.data?.signatures ?? []);
    if (editingId === id) {
      setEditingId(null);
      setName("");
      setHtml("");
    }
    router.refresh();
  }

  const showEditor = editingId !== null || name || html;

  return (
    <div className="grid max-w-4xl gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your signatures
          </h2>
          <button
            type="button"
            onClick={startCreate}
            className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
          >
            + New signature
          </button>
        </div>

        {signatures.length === 0 ? (
          <p className="text-sm text-slate-500">
            No signatures yet. Create one — Compose will append the default on send.
          </p>
        ) : (
          <ul className="space-y-2">
            {signatures.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-slate-700/70 bg-slate-950/40 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {row.name}
                      {row.isDefault ? (
                        <span className="ml-2 text-xs font-normal text-emerald-400">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Updated {new Date(row.updatedAt).toLocaleString("en-AU")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="text-xs text-sky-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(row.id)}
                      disabled={pending}
                      className="text-xs text-rose-400 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {showEditor ? (
          <div className="space-y-3 rounded-lg border border-slate-700 p-4">
            <h3 className="text-sm font-medium text-white">
              {editing ? `Edit · ${editing.name}` : "New signature"}
            </h3>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                placeholder="e.g. Default"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">HTML body</span>
              <textarea
                rows={8}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-slate-600"
              />
              Use as default on Compose
            </label>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setName("");
                  setHtml("");
                  setError(null);
                }}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Preview
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Plain HTML preview — Gmail/Outlook fidelity comes later.
        </p>
        {html.trim() || editing?.html ? (
          <div
            className="mt-3 min-h-[160px] rounded-lg border border-slate-700 bg-white px-4 py-3 text-sm text-slate-900"
            dangerouslySetInnerHTML={{ __html: html.trim() || editing?.html || "" }}
          />
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-slate-700 px-4 py-8 text-sm text-slate-500">
            Select or create a signature to preview.
          </p>
        )}
      </div>
    </div>
  );
}

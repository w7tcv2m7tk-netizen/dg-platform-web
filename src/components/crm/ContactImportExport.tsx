"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function ContactImportExport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);
    setError(null);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/v1/contacts/import", {
      method: "POST",
      body: form,
    });

    const json = await res.json().catch(() => null);
    setImporting(false);
    e.target.value = "";

    if (!res.ok) {
      setError(json?.error?.message ?? "Import failed");
      return;
    }

    const { imported, skipped, errors } = json.data ?? {};
    setMessage(
      `Imported ${imported} contact${imported === 1 ? "" : "s"}${skipped ? ` · ${skipped} skipped` : ""}`,
    );
    if (errors?.length) {
      setError(errors.slice(0, 3).join("; "));
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href="/api/v1/contacts/export"
        className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
      >
        Export CSV
      </a>
      <button
        type="button"
        disabled={importing}
        onClick={() => fileRef.current?.click()}
        className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-50"
      >
        {importing ? "Importing…" : "Import CSV"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => void onImport(e)}
      />
      {message ? <span className="text-sm text-emerald-400">{message}</span> : null}
      {error ? <span className="text-sm text-amber-300">{error}</span> : null}
    </div>
  );
}

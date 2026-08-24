"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const KINDS = [
  { id: "agency_agreement", label: "Agency agreement" },
  { id: "disclosure_statement", label: "Disclosure statement" },
  { id: "contract", label: "Contract" },
  { id: "service_agreement", label: "Service agreement" },
  { id: "other", label: "Other" },
] as const;

export function DocumentsUploadForm({
  defaultKind = "other",
  entityType,
  entityId,
}: {
  defaultKind?: string;
  entityType?: string;
  entityId?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState(defaultKind);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setPending(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    form.append("signed", "1");
    if (entityType) form.append("entityType", entityType);
    if (entityId) form.append("entityId", entityId);
    const res = await fetch("/api/v1/documents", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Upload failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="text-slate-400">Document type</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        >
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload a document"}
      </button>
      <p className="text-xs text-slate-500">
        Upload · Create · Send for signature · Track · Complete — providers plug in later.
      </p>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export type DisclosureStatementView = {
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
};

function formatBytes(n: number) {
  if (!n || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function PropertyDisclosureStatementPanel({
  propertyId,
  disclosureStatement,
}: {
  propertyId: string;
  disclosureStatement?: DisclosureStatementView | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setPending(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/v1/properties/${propertyId}/disclosure-statement`, {
      method: "POST",
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not save disclosure statement");
      return;
    }
    router.refresh();
  }

  async function clearDisclosure() {
    if (!disclosureStatement) return;
    if (!window.confirm("Clear the disclosure statement from this listing?")) {
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch(`/api/v1/properties/${propertyId}/disclosure-statement`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not clear disclosure statement");
      return;
    }
    router.refresh();
  }

  return (
    <div className="dg-card">
      <h2 className="font-semibold text-white">Disclosure statement</h2>
      <p className="mt-1 text-sm text-slate-400">
        Property Documents view — upload an existing disclosure PDF or scan. Create-from-template
        and send-for-signature land via Core Documents & Signing.
      </p>

      {disclosureStatement ? (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
          <p className="text-sm text-white">{disclosureStatement.fileName}</p>
          <p className="mt-1 text-xs text-slate-500">
            Saved {new Date(disclosureStatement.uploadedAt).toLocaleString("en-AU")}
            {disclosureStatement.sizeBytes
              ? ` · ${formatBytes(disclosureStatement.sizeBytes)}`
              : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={disclosureStatement.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500"
            >
              View / download
            </a>
            <button
              type="button"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500 disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void clearDisclosure()}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:border-rose-500 hover:text-rose-300 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-slate-500">No disclosure statement on file yet.</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            className="mt-3 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? "Uploading…" : "Upload disclosure statement"}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}

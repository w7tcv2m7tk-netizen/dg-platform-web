"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export type AgencyAgreementView = {
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

export function PropertyAgencyAgreementPanel({
  propertyId,
  agreement,
}: {
  propertyId: string;
  agreement?: AgencyAgreementView | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const libraryHref = `/apps/documents/library?entityType=property&entityId=${encodeURIComponent(propertyId)}&kind=agency_agreement`;

  async function upload(file: File) {
    setPending(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/v1/properties/${propertyId}/agency-agreement`, {
      method: "POST",
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not save agreement");
      return;
    }
    router.refresh();
  }

  async function clearAgreement() {
    if (!agreement) return;
    if (!window.confirm("Clear the signed agency agreement from this listing?")) {
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch(`/api/v1/properties/${propertyId}/agency-agreement`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not clear agreement");
      return;
    }
    router.refresh();
  }

  return (
    <div className="dg-card">
      <h2 className="font-semibold text-white">Agency agreement</h2>
      <p className="mt-1 text-sm text-slate-400">
        Contextual view of Core Documents — upload an authority PDF on this property. Create
        from template and send for signature come next.
      </p>

      {agreement ? (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
          <p className="text-xs uppercase tracking-wide text-emerald-400/90">Completed · on file</p>
          <p className="mt-1 text-sm text-white">{agreement.fileName}</p>
          <p className="mt-1 text-xs text-slate-500">
            Saved {new Date(agreement.uploadedAt).toLocaleString("en-AU")}
            {agreement.sizeBytes ? ` · ${formatBytes(agreement.sizeBytes)}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={agreement.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500"
            >
              View / download
            </a>
            <Link
              href={libraryHref}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-sky-500"
            >
              Open in Documents
            </Link>
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
              onClick={() => void clearAgreement()}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:border-rose-500 hover:text-rose-300 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-slate-500">No signed agency agreement on file yet.</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            className="mt-3 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? "Uploading…" : "Upload agreement"}
          </button>
          <p className="mt-2">
            <Link href={libraryHref} className="text-xs text-sky-400 hover:underline">
              Open in Documents
            </Link>
          </p>
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

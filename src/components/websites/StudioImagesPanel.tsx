"use client";

import { useRef, useState } from "react";

import {
  AIDA_MEDIA,
  mediaAbsoluteUrl,
  mediaImgSnippet,
  type StudioMediaImage,
} from "@/lib/studio-media";

type LibraryImage = StudioMediaImage & { deletable: boolean };

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

function toLibraryImage(row: {
  id: string;
  label: string;
  src: string;
  width: number;
  height: number;
  alt: string;
}): LibraryImage {
  return { ...row, deletable: true };
}

/**
 * Hosted image library for Design Studio: curated + organisation uploads,
 * with copy-ready URLs and <img> snippets.
 */
export function StudioImagesPanel({
  initialUploaded = [],
}: {
  initialUploaded?: Array<{
    id: string;
    label: string;
    src: string;
    width: number;
    height: number;
    alt: string;
  }>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<LibraryImage[]>(() =>
    initialUploaded.map(toLibraryImage),
  );
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function copy(text: string, key: string) {
    void navigator.clipboard?.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
  }

  async function uploadFiles(files: File[]) {
    const images = files.filter((f) => ACCEPT.split(",").includes(f.type) || /\.(png|jpe?g|webp|gif)$/i.test(f.name));
    if (images.length === 0) {
      setError("Use PNG, JPG, WebP, or GIF");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      for (const file of images) {
        const dims = await readDimensions(file);
        const form = new FormData();
        form.append("file", file);
        form.append("label", file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
        form.append("width", String(dims.width));
        form.append("height", String(dims.height));
        const res = await fetch("/api/v1/websites/images", { method: "POST", body: form });
        const json = (await res.json().catch(() => null)) as {
          data?: { image?: LibraryImage };
          error?: { message?: string };
        };
        if (!res.ok) {
          throw new Error(json?.error?.message ?? "Upload failed");
        }
        const image = json.data?.image;
        if (image) {
          setUploaded((prev) => [toLibraryImage(image), ...prev]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeImage(m: LibraryImage) {
    if (!window.confirm(`Delete “${m.label}”? This cannot be undone.`)) return;
    setDeletingId(m.id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/websites/images/${encodeURIComponent(m.id)}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Delete failed");
      }
      setUploaded((prev) => prev.filter((row) => row.id !== m.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  function Tile({ m }: { m: StudioMediaImage & { deletable?: boolean } }) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2">
        <div className="relative mb-2 aspect-[3/4] overflow-hidden rounded bg-gradient-to-br from-violet-500/15 to-blue-500/10">
          {/* Hosted Blob URLs are not in next/image remotePatterns — use img. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.src}
            alt={m.alt}
            width={m.width || 180}
            height={m.height || 240}
            className="h-full w-full object-contain"
          />
        </div>
        <p className="truncate text-[11px] font-medium text-slate-300" title={m.label}>
          {m.label}
        </p>
        <p className="text-[10px] text-slate-500">
          {m.width && m.height ? `${m.width}×${m.height}` : "size unknown"}
          {m.note ? ` · ${m.note}` : ""}
        </p>
        <div className="mt-1.5 flex gap-1">
          <button
            type="button"
            onClick={() => copy(mediaAbsoluteUrl(m.src), `${m.id}:url`)}
            className="flex-1 rounded border border-slate-600 px-1.5 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
          >
            {copied === `${m.id}:url` ? "Copied" : "Copy URL"}
          </button>
          <button
            type="button"
            onClick={() => copy(mediaImgSnippet(m), `${m.id}:img`)}
            className="flex-1 rounded border border-slate-600 px-1.5 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
          >
            {copied === `${m.id}:img` ? "Copied" : "Copy <img>"}
          </button>
        </div>
        {m.deletable ? (
          <button
            type="button"
            disabled={deletingId === m.id}
            onClick={() => void removeImage(m as LibraryImage)}
            className="mt-1 w-full rounded border border-rose-900/70 px-1.5 py-1 text-[10px] text-rose-300 hover:bg-rose-950/40 disabled:opacity-50"
          >
            {deletingId === m.id ? "Deleting…" : "Delete"}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploadFiles([...e.dataTransfer.files]);
        }}
        className={`rounded-lg border border-dashed p-4 ${
          dragOver ? "border-sky-500 bg-sky-950/20" : "border-slate-700 bg-slate-950/40"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">Upload images</p>
            <p className="text-[11px] text-slate-500">
              PNG, JPG, WebP or GIF · up to 5 MB · drop files here or browse
            </p>
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-md bg-[var(--org-primary,#1e3a5f)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              const files = e.target.files ? [...e.target.files] : [];
              if (files.length) void uploadFiles(files);
            }}
          />
        </div>
        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-violet-300/80">
          Your images
        </p>
        {uploaded.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing uploaded yet — files you add here are available to paste into Studio HTML.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {uploaded.map((m) => (
              <Tile key={m.id} m={m} />
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-violet-300/80">
          Aida — AI Business Advisor
        </p>
        <p className="mb-2 text-[11px] text-slate-500">
          Platform images — copy only; they cannot be deleted.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {AIDA_MEDIA.map((m) => (
            <Tile key={m.id} m={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

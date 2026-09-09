"use client";

import Image from "next/image";
import { useState } from "react";

import {
  STUDIO_MEDIA,
  mediaAbsoluteUrl,
  mediaImgSnippet,
  type StudioMediaImage,
} from "@/lib/studio-media";

/**
 * Hosted image library for Design Studio: curated images with copy-ready URLs
 * and <img> snippets to paste into Header / Page / Footer HTML.
 */
export function StudioImagesPanel() {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    void navigator.clipboard?.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
  }

  function Tile({ m }: { m: StudioMediaImage }) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2">
        <div className="relative mb-2 aspect-[3/4] overflow-hidden rounded bg-gradient-to-br from-violet-500/15 to-blue-500/10">
          <Image
            src={m.src}
            alt={m.alt}
            fill
            sizes="180px"
            className="object-contain"
          />
        </div>
        <p className="truncate text-[11px] font-medium text-slate-300" title={m.label}>
          {m.label}
        </p>
        <p className="text-[10px] text-slate-500">
          {m.width}×{m.height}
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {STUDIO_MEDIA.map((g) => (
        <div key={g.group}>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-violet-300/80">
            {g.group}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {g.images.map((m) => (
              <Tile key={m.id} m={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

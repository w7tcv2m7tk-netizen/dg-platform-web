"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

type PhotoItem = {
  id: string;
  url: string;
  caption?: string;
};

function readChecklist(metadata: Record<string, unknown> | null): ChecklistItem[] {
  const raw = metadata?.checklist;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `item-${index}`,
      label: typeof item.label === "string" ? item.label : `Item ${index + 1}`,
      done: item.done === true,
    }));
}

function readPhotos(metadata: Record<string, unknown> | null): PhotoItem[] {
  const raw = metadata?.photos;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `photo-${index}`,
      url: typeof item.url === "string" ? item.url : "",
      caption: typeof item.caption === "string" ? item.caption : undefined,
    }))
    .filter((p) => p.url.trim().length > 0);
}

export function JobChecklistPhotosPanel({
  jobId,
  metadata,
}: {
  jobId: string;
  metadata: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const initialChecklist = useMemo(() => readChecklist(metadata), [metadata]);
  const initialPhotos = useMemo(() => readPhotos(metadata), [metadata]);
  const [checklist, setChecklist] = useState(initialChecklist);
  const [photos, setPhotos] = useState(initialPhotos);
  const [newLabel, setNewLabel] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(nextChecklist: ChecklistItem[], nextPhotos: PhotoItem[]) {
    setPending(true);
    setError(null);
    const nextMetadata = {
      ...(metadata ?? {}),
      checklist: nextChecklist,
      photos: nextPhotos,
    };
    const res = await fetch(`/api/v1/services/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: nextMetadata }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not save checklist / photos");
      return false;
    }
    router.refresh();
    return true;
  }

  async function toggleItem(id: string) {
    const next = checklist.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item,
    );
    setChecklist(next);
    await persist(next, photos);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    const next = [...checklist, { id: `c-${Date.now()}`, label, done: false }];
    setChecklist(next);
    setNewLabel("");
    await persist(next, photos);
  }

  async function addPhoto(e: React.FormEvent) {
    e.preventDefault();
    const url = photoUrl.trim();
    if (!url) return;
    const next = [
      ...photos,
      {
        id: `p-${Date.now()}`,
        url,
        caption: photoCaption.trim() || undefined,
      },
    ];
    setPhotos(next);
    setPhotoUrl("");
    setPhotoCaption("");
    await persist(checklist, next);
  }

  async function removePhoto(id: string) {
    const next = photos.filter((p) => p.id !== id);
    setPhotos(next);
    await persist(checklist, next);
  }

  return (
    <section className="dg-card space-y-6">
      <div>
        <h2 className="font-semibold text-white">Checklist</h2>
        <p className="mt-1 text-xs text-slate-500">
          On-site checklist stored on the job metadata — not a separate table yet.
        </p>
        {checklist.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No checklist items yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={item.done}
                  disabled={pending}
                  onChange={() => void toggleItem(item.id)}
                  className="mt-1"
                />
                <span
                  className={`text-sm ${item.done ? "text-slate-500 line-through" : "text-slate-200"}`}
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addItem} className="mt-3 flex flex-wrap gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Add checklist item"
            className="min-w-[12rem] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            disabled={pending || !newLabel.trim()}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-semibold text-white">Photos</h2>
        <p className="mt-1 text-xs text-slate-500">
          Paste image URLs (CDN / storage links). Native upload can come later.
        </p>
        {photos.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No photos yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {photos.map((photo) => (
              <li
                key={photo.id}
                className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || "Job photo"}
                  className="h-36 w-full object-cover"
                />
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <p className="truncate text-xs text-slate-400">
                    {photo.caption || photo.url}
                  </p>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void removePhoto(photo.id)}
                    className="text-xs text-red-400 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addPhoto} className="mt-3 space-y-2">
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://… image URL"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <div className="flex flex-wrap gap-2">
            <input
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="min-w-[12rem] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              disabled={pending || !photoUrl.trim()}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-50"
            >
              Add photo
            </button>
          </div>
        </form>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </section>
  );
}

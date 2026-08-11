"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ListingFields = {
  propertyId: string;
  listingPriceCents?: number | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  carSpaces?: number | null;
  landSize?: string | null;
  buildingSize?: string | null;
  yearBuilt?: string | number | null;
  headline?: string;
  description?: string;
  features?: string;
  images?: string[];
  inspectionTimes?: string | null;
  cotalityPrefillNote?: string | null;
};

function listingImagesText(images: string[] | undefined) {
  return (images ?? []).join("\n");
}

function reorderList<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function PropertyListingEditor(props: ListingFields) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [price, setPrice] = useState(
    props.listingPriceCents != null ? String(props.listingPriceCents / 100) : "",
  );
  const [propertyType, setPropertyType] = useState(props.propertyType ?? "");
  const [bedrooms, setBedrooms] = useState(
    props.bedrooms != null ? String(props.bedrooms) : "",
  );
  const [bathrooms, setBathrooms] = useState(
    props.bathrooms != null ? String(props.bathrooms) : "",
  );
  const [carSpaces, setCarSpaces] = useState(
    props.carSpaces != null ? String(props.carSpaces) : "",
  );
  const [landSize, setLandSize] = useState(props.landSize ?? "");
  const [buildingSize, setBuildingSize] = useState(props.buildingSize ?? "");
  const [yearBuilt, setYearBuilt] = useState(
    props.yearBuilt != null ? String(props.yearBuilt) : "",
  );
  const [headline, setHeadline] = useState(props.headline ?? "");
  const [description, setDescription] = useState(props.description ?? "");
  const [features, setFeatures] = useState(props.features ?? "");
  const [inspectionTimes, setInspectionTimes] = useState(props.inspectionTimes ?? "");
  const [images, setImages] = useState<string[]>(props.images ?? []);
  const [imagesText, setImagesText] = useState(listingImagesText(props.images));
  const [pending, setPending] = useState(false);
  const [aiPending, setAiPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cotality refresh (and other router.refresh paths) update server props while this
  // client form stays mounted — re-sync so blank/overwrite prefills appear in inputs.
  const imagesKey = listingImagesText(props.images);
  useEffect(() => {
    setPrice(
      props.listingPriceCents != null ? String(props.listingPriceCents / 100) : "",
    );
    setPropertyType(props.propertyType ?? "");
    setBedrooms(props.bedrooms != null ? String(props.bedrooms) : "");
    setBathrooms(props.bathrooms != null ? String(props.bathrooms) : "");
    setCarSpaces(props.carSpaces != null ? String(props.carSpaces) : "");
    setLandSize(props.landSize ?? "");
    setBuildingSize(props.buildingSize ?? "");
    setYearBuilt(props.yearBuilt != null ? String(props.yearBuilt) : "");
    setHeadline(props.headline ?? "");
    setDescription(props.description ?? "");
    setFeatures(props.features ?? "");
    setInspectionTimes(props.inspectionTimes ?? "");
    setImages(props.images ?? []);
    setImagesText(imagesKey);
  }, [
    props.listingPriceCents,
    props.propertyType,
    props.bedrooms,
    props.bathrooms,
    props.carSpaces,
    props.landSize,
    props.buildingSize,
    props.yearBuilt,
    props.headline,
    props.description,
    props.features,
    props.inspectionTimes,
    imagesKey,
  ]);

  function syncImagesFromText(text: string) {
    setImagesText(text);
    setImages(
      text
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter((s) => s.startsWith("http")),
    );
  }

  function applyImages(next: string[]) {
    setImages(next);
    setImagesText(next.join("\n"));
  }

  function moveImage(from: number, to: number) {
    applyImages(reorderList(images, from, to));
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/v1/org/brand-asset?maxKb=2048", {
      method: "POST",
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not upload image");
      return;
    }
    const url = json.data?.url as string | undefined;
    if (!url) return;
    applyImages([...images, url]);
  }

  async function draftDescriptionWithAi() {
    setAiPending(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/v1/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "listing_description",
        propertyId: props.propertyId,
        listingDraft: {
          propertyType: propertyType.trim() || null,
          bedrooms: bedrooms.trim() ? parseInt(bedrooms, 10) : null,
          bathrooms: bathrooms.trim() ? parseInt(bathrooms, 10) : null,
          carSpaces: carSpaces.trim() ? parseInt(carSpaces, 10) : null,
          landSize: landSize.trim() || null,
          buildingSize: buildingSize.trim() || null,
          yearBuilt: yearBuilt.trim() || null,
          headline: headline.trim() || null,
          description: description.trim() || null,
          features: features.trim() || null,
          listingPriceCents: (() => {
            const dollars = parseFloat(price.replace(/[^0-9.]/g, ""));
            return Number.isFinite(dollars) ? Math.round(dollars * 100) : null;
          })(),
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    setAiPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not draft description");
      return;
    }
    const output = typeof json.data?.output === "string" ? json.data.output.trim() : "";
    if (!output) {
      setError("AI assist returned an empty draft");
      return;
    }
    setDescription(output);
    const source = json.data?.source === "llm" ? "LLM" : "template";
    setMessage(
      `AI draft (${source}) from Cotality + listing facts — not a valuation. Edit, then Save listing.`,
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const dollars = parseFloat(price.replace(/[^0-9.]/g, ""));
    const listingPriceCents = Number.isFinite(dollars)
      ? Math.round(dollars * 100)
      : null;

    const res = await fetch(`/api/v1/properties/${props.propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingPriceCents,
        propertyType: propertyType.trim() || null,
        bedrooms: bedrooms.trim() ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms.trim() ? parseInt(bathrooms, 10) : null,
        carSpaces: carSpaces.trim() ? parseInt(carSpaces, 10) : null,
        landSize: landSize.trim() || null,
        buildingSize: buildingSize.trim() || null,
        yearBuilt: yearBuilt.trim() || null,
        images,
        marketing: {
          headline: headline.trim() || undefined,
          description: description.trim() || undefined,
          features: features.trim() || undefined,
        },
        inspectionTimes: inspectionTimes.trim() || null,
        syncToWebsite: true,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not save listing details");
      return;
    }
    setMessage("Listing details saved (and synced to website if connected).");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="dg-card space-y-4">
      <div>
        <h2 className="font-semibold text-white">Listing details</h2>
        <p className="mt-1 text-sm text-slate-400">
          Edit copy, specs, and images. Changes sync to the website when published/listed.
        </p>
        {props.cotalityPrefillNote ? (
          <p className="mt-2 text-xs text-emerald-400/90">{props.cotalityPrefillNote}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-400">Guide price ($)</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="850000"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Property type</span>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            <option value="">—</option>
            {["House", "Apartment", "Townhouse", "Unit", "Land", "Acreage"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Bedrooms</span>
          <input
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Bathrooms</span>
          <input
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Car spaces</span>
          <input
            value={carSpaces}
            onChange={(e) => setCarSpaces(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Land size</span>
          <input
            value={landSize}
            onChange={(e) => setLandSize(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="e.g. 650 m²"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Building size</span>
          <input
            value={buildingSize}
            onChange={(e) => setBuildingSize(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="e.g. 180 m²"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Year built</span>
          <input
            value={yearBuilt}
            onChange={(e) => setYearBuilt(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="e.g. 1998"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-slate-400">Headline</span>
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
      </label>

      <div className="block text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-400">Description</span>
          <button
            type="button"
            disabled={aiPending || pending}
            onClick={() => void draftDescriptionWithAi()}
            className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500 disabled:opacity-50"
          >
            {aiPending
              ? "Drafting…"
              : description.trim()
                ? "Update description from Cotality"
                : "Write description with AI"}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Cotality does not supply marketing copy — this drafts from stored Cotality facts and
          listing fields. Review before save.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
      </div>

      <label className="block text-sm">
        <span className="text-slate-400">Features (one per line)</span>
        <textarea
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
      </label>

      <label className="block text-sm">
        <span className="text-slate-400">Inspection / open home times</span>
        <input
          value={inspectionTimes}
          onChange={(e) => setInspectionTimes(e.target.value)}
          placeholder="e.g. Saturday 10:00–10:30am"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
      </label>

      <div>
        <p className="text-sm text-slate-400">Listing images</p>
        <p className="mt-1 text-[11px] text-slate-500">
          First image is featured. Drag to reorder (desktop) or use ↑ ↓ (mobile).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:border-blue-500 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload image"}
          </button>
          <span className="self-center text-xs text-slate-500">PNG/JPG/WebP up to 2 MB</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadImage(file);
            e.target.value = "";
          }}
        />
        {images.length ? (
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {images.map((url, index) => {
              const isFeatured = index === 0;
              const isDropTarget = dragOverIndex === index && dragIndexRef.current !== index;
              return (
                <li
                  key={`${url}-${index}`}
                  draggable
                  onDragStart={() => {
                    dragIndexRef.current = index;
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === index) setDragOverIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragIndexRef.current;
                    dragIndexRef.current = null;
                    setDragOverIndex(null);
                    if (from == null) return;
                    moveImage(from, index);
                  }}
                  onDragEnd={() => {
                    dragIndexRef.current = null;
                    setDragOverIndex(null);
                  }}
                  className={`relative touch-manipulation rounded-lg ${
                    isDropTarget ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className={`h-24 w-full cursor-grab rounded-lg object-cover active:cursor-grabbing ${
                      isFeatured
                        ? "ring-2 ring-blue-500"
                        : "ring-1 ring-slate-700"
                    }`}
                  />
                  {isFeatured ? (
                    <span className="absolute left-1 top-1 rounded bg-blue-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Featured
                    </span>
                  ) : (
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-slate-200">
                      {index + 1}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Remove image"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => applyImages(images.filter((_, i) => i !== index))}
                    className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white"
                  >
                    ✕
                  </button>
                  <div
                    className="absolute bottom-1 right-1 flex gap-0.5"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      aria-label="Move image earlier"
                      disabled={index === 0}
                      onClick={() => moveImage(index, index - 1)}
                      className="min-h-8 min-w-8 rounded bg-black/70 text-sm text-white disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move image later"
                      disabled={index === images.length - 1}
                      onClick={() => moveImage(index, index + 1)}
                      className="min-h-8 min-w-8 rounded bg-black/70 text-sm text-white disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
        <label className="mt-3 block text-sm">
          <span className="text-slate-500">Or paste image URLs (one per line — order = gallery order)</span>
          <textarea
            value={imagesText}
            onChange={(e) => syncImagesFromText(e.target.value)}
            rows={3}
            placeholder="https://…/photo1.jpg"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save listing"}
      </button>
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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

export function PropertyListingEditor(props: ListingFields) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
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
  const [imagesText, setImagesText] = useState((props.images ?? []).join("\n"));
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function syncImagesFromText(text: string) {
    setImagesText(text);
    setImages(
      text
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter((s) => s.startsWith("http")),
    );
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
    const next = [...images, url];
    setImages(next);
    setImagesText(next.join("\n"));
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

      <label className="block text-sm">
        <span className="text-slate-400">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
      </label>

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
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-20 w-28 rounded-lg object-cover ring-1 ring-slate-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = images.filter((u) => u !== url);
                    setImages(next);
                    setImagesText(next.join("\n"));
                  }}
                  className="absolute right-1 top-1 rounded bg-black/70 px-1.5 text-[10px] text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <label className="mt-3 block text-sm">
          <span className="text-slate-500">Or paste image URLs (one per line)</span>
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

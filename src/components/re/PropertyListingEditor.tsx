"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ListingFields = {
  propertyId: string;
  listingPriceCents?: number | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  carSpaces?: number | null;
  landSize?: string | null;
  buildingSize?: string | null;
  headline?: string;
  description?: string;
  features?: string;
  images?: string[];
};

export function PropertyListingEditor(props: ListingFields) {
  const router = useRouter();
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
  const [headline, setHeadline] = useState(props.headline ?? "");
  const [description, setDescription] = useState(props.description ?? "");
  const [features, setFeatures] = useState(props.features ?? "");
  const [imagesText, setImagesText] = useState((props.images ?? []).join("\n"));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewImages = imagesText
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("http"));

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
        images: previewImages,
        marketing: {
          headline: headline.trim() || undefined,
          description: description.trim() || undefined,
          features: features.trim() || undefined,
        },
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
          Edit copy, specs, and image URLs. Changes sync to the website when published/listed.
        </p>
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
        <span className="text-slate-400">Image URLs (one per line)</span>
        <textarea
          value={imagesText}
          onChange={(e) => setImagesText(e.target.value)}
          rows={4}
          placeholder="https://…/photo1.jpg"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white"
        />
      </label>

      {previewImages.length ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previewImages.slice(0, 8).map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="aspect-square rounded-lg object-cover"
            />
          ))}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save listing details"}
      </button>
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
    </form>
  );
}

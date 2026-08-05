"use client";

import { useCallback, useState } from "react";

export type ResolvedAddressFields = {
  addressLine1: string;
  suburb: string;
  state: string;
  postcode: string;
  formatted: string;
  confidence?: string;
  geocodeSource?: string | null;
  metadata?: Record<string, unknown>;
};

type AddressInputProps = {
  value: string;
  onChange: (value: string) => void;
  suburb?: string;
  state?: string;
  postcode?: string;
  onSuburbChange?: (value: string) => void;
  onStateChange?: (value: string) => void;
  onPostcodeChange?: (value: string) => void;
  onResolved?: (resolved: ResolvedAddressFields) => void;
  showStructuredFields?: boolean;
  resolveOnBlur?: boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
};

export function AddressInput({
  value,
  onChange,
  suburb = "",
  state = "QLD",
  postcode = "",
  onSuburbChange,
  onStateChange,
  onPostcodeChange,
  onResolved,
  showStructuredFields = true,
  resolveOnBlur = true,
  label = "Address",
  placeholder = "e.g. 11 Kianga Court, Currumbin Valley",
  required = false,
  id = "address-input",
}: AddressInputProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyResolved = useCallback(
    (data: ResolvedAddressFields) => {
      onChange(data.addressLine1);
      onSuburbChange?.(data.suburb);
      onStateChange?.(data.state);
      onPostcodeChange?.(data.postcode);
      onResolved?.(data);
    },
    [onChange, onPostcodeChange, onResolved, onStateChange, onSuburbChange],
  );

  async function findAddress(raw = value) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    setPending(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/v1/addresses/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawAddress: trimmed }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Address lookup failed");
      return;
    }

    const data = json?.data as ResolvedAddressFields | undefined;
    if (!data) {
      setError("Address lookup returned no data");
      return;
    }

    applyResolved(data);

    if (data.confidence === "geocoded") {
      setMessage(
        data.geocodeSource === "google"
          ? "Address found via Google"
          : "Address found automatically",
      );
    } else {
      setMessage("Address refined with local hints");
    }
  }

  function handleBlur() {
    if (resolveOnBlur && value.trim()) {
      void findAddress(value);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={id} className="mb-1 block text-sm text-slate-300">
          {label}
          {required ? " *" : null}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={id}
            type="text"
            value={value}
            required={required}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleBlur}
            className="min-w-[16rem] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => void findAddress()}
            disabled={pending || !value.trim()}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-50"
          >
            {pending ? "Finding…" : "Find address"}
          </button>
        </div>
        {message ? <p className="mt-1 text-xs text-emerald-400/90">{message}</p> : null}
        {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
      </div>

      {showStructuredFields ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor={`${id}-suburb`} className="mb-1 block text-xs text-slate-400">
              Suburb
            </label>
            <input
              id={`${id}-suburb`}
              type="text"
              value={suburb}
              onChange={(e) => onSuburbChange?.(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor={`${id}-state`} className="mb-1 block text-xs text-slate-400">
              State
            </label>
            <input
              id={`${id}-state`}
              type="text"
              value={state}
              onChange={(e) => onStateChange?.(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor={`${id}-postcode`} className="mb-1 block text-xs text-slate-400">
              Postcode
            </label>
            <input
              id={`${id}-postcode`}
              type="text"
              value={postcode}
              onChange={(e) => onPostcodeChange?.(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

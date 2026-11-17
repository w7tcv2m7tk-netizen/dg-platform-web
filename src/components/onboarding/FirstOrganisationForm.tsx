"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function FirstOrganisationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/onboarding/first-organisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error?.message ?? "Could not set up your organisation. Please try again.");
        return;
      }
      router.replace("/onboarding");
      router.refresh();
    } catch {
      setError("Connection interrupted. Submit again to safely continue setup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-slate-200" htmlFor="first-org-name">
        Organisation name
      </label>
      <input
        id="first-org-name"
        autoComplete="organization"
        required
        maxLength={120}
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
      />
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Setting up…" : "Continue to onboarding"}
      </button>
    </form>
  );
}

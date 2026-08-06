"use client";

import { useCallback, useState } from "react";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export function PlatformApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/platform/api-keys");
    const json = await res.json().catch(() => null);
    setLoading(false);
    setLoaded(true);

    if (!res.ok) {
      setError(json?.error?.message ?? "Could not load API keys");
      return;
    }

    setKeys(json.data ?? []);
  }, []);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;

    setCreating(true);
    setError(null);
    setNewSecret(null);

    const res = await fetch("/api/v1/platform/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const json = await res.json().catch(() => null);
    setCreating(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Could not create API key");
      return;
    }

    setNewSecret(json.data.secret);
    setName("");
    await loadKeys();
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key? Integrations using it will stop working.")) return;

    const res = await fetch(`/api/v1/platform/api-keys/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error?.message ?? "Could not revoke key");
      return;
    }

    await loadKeys();
  }

  return (
    <div className="space-y-6">
      {!loaded ? (
        <button
          type="button"
          onClick={() => void loadKeys()}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load API keys"}
        </button>
      ) : null}

      {error ? <p className="text-sm text-amber-300">{error}</p> : null}

      {newSecret ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-sm font-medium text-emerald-200">New API key — copy now</p>
          <p className="mt-2 break-all font-mono text-xs text-white">{newSecret}</p>
          <p className="mt-2 text-xs text-emerald-200/70">
            This secret is shown once. Store it in your password manager or integration config.
          </p>
        </div>
      ) : null}

      {loaded ? (
        <>
          <form onSubmit={createKey} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Key name (e.g. Zapier, Roe sync)"
              className="min-w-[220px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create key"}
            </button>
          </form>

          {keys.length === 0 ? (
            <p className="text-sm text-slate-400">No active API keys.</p>
          ) : (
            <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
              {keys.map((key) => (
                <li key={key.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{key.name}</p>
                    <p className="font-mono text-xs text-slate-500">
                      {key.keyPrefix}… · created{" "}
                      {new Date(key.createdAt).toLocaleDateString("en-AU")}
                      {key.lastUsedAt
                        ? ` · last used ${new Date(key.lastUsedAt).toLocaleDateString("en-AU")}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revokeKey(key.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

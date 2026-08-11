"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { BusinessProfilePatch } from "@dg/platform-core";

type IdentityPreview = {
  legalName?: string;
  tradingNames?: string[];
  businessNames?: string[];
  status?: string;
  typeDescription?: string;
  gstRegistered?: boolean;
  abn?: string;
  acn?: string;
  address?: {
    state?: string;
    postcode?: string;
    country?: string;
  };
};

type NameMatch = {
  abn: string;
  businessName: string;
  location?: string;
};

type Mode = "abn" | "acn" | "name";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

function Message({
  tone,
  children,
}: {
  tone: "ok" | "err" | "info";
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "err"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
        : "border-slate-600/40 bg-slate-900/60 text-slate-300";
  return (
    <p className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</p>
  );
}

/**
 * Business Setup · Identify — ABR verify → Business Identity → apply to Business Profile.
 * Never exposes ABR GUID. ASIC registration is handoff/roadmap only.
 */
export function BusinessSetupIdentifyPanel({
  abrConfigured,
}: {
  abrConfigured: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("abn");
  const [abn, setAbn] = useState("");
  const [acn, setAcn] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [nameMatches, setNameMatches] = useState<NameMatch[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [searchingName, setSearchingName] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<IdentityPreview | null>(null);
  const [profilePatch, setProfilePatch] = useState<BusinessProfilePatch | null>(
    null,
  );
  const [message, setMessage] = useState<{
    tone: "ok" | "err" | "info";
    text: string;
  } | null>(null);

  function clearResult() {
    setPreview(null);
    setProfilePatch(null);
  }

  async function verifyAbn(value?: string) {
    const target = (value ?? abn).trim();
    if (!target) {
      setMessage({ tone: "err", text: "Enter an ABN to verify." });
      return;
    }
    if (!abrConfigured) {
      setMessage({
        tone: "err",
        text: "ABR not configured. Paste ABN_LOOKUP_GUID (or ABR_GUID) into server .env.local — never in the browser.",
      });
      return;
    }

    setLookingUp(true);
    setMessage(null);
    clearResult();
    if (value) setAbn(value);

    const res = await fetch(
      `/api/v1/business-identity/abn?abn=${encodeURIComponent(target)}`,
    );
    const json = await res.json().catch(() => null);
    setLookingUp(false);

    if (!res.ok) {
      const text =
        json?.data?.abr?.message ||
        json?.error?.message ||
        (res.status === 503
          ? "ABR not configured on this server."
          : "ABN lookup failed.");
      setMessage({ tone: "err", text });
      return;
    }

    const identity = json?.data?.identity;
    const patch = (json?.data?.profilePatch ?? null) as BusinessProfilePatch | null;
    setProfilePatch(patch);
    setPreview({
      legalName: identity?.entity?.legalName,
      tradingNames: identity?.entity?.tradingNames,
      businessNames: identity?.entity?.businessNames,
      status: identity?.entity?.status,
      typeDescription: identity?.entity?.typeDescription,
      gstRegistered: identity?.entity?.gstRegistered,
      abn: identity?.identifiers?.abn,
      acn: identity?.identifiers?.acn,
      address: identity?.entity?.address,
    });
    if (identity?.identifiers?.acn) setAcn(identity.identifiers.acn);
    setMessage({
      tone: "ok",
      text: identity?.entity?.legalName
        ? `Verified — ${identity.entity.legalName}. Review below, then apply to Business Profile.`
        : "Verified. Review below, then apply to Business Profile.",
    });
  }

  async function verifyAcn() {
    const target = acn.trim();
    if (!target) {
      setMessage({ tone: "err", text: "Enter an ACN to look up." });
      return;
    }
    if (!abrConfigured) {
      setMessage({
        tone: "err",
        text: "ABR not configured. Paste ABN_LOOKUP_GUID (or ABR_GUID) into server .env.local — never in the browser.",
      });
      return;
    }

    setLookingUp(true);
    setMessage(null);
    clearResult();

    const res = await fetch(
      `/api/v1/business-identity/acn?acn=${encodeURIComponent(target)}`,
    );
    const json = await res.json().catch(() => null);
    setLookingUp(false);

    if (!res.ok) {
      const text =
        json?.data?.abr?.message ||
        json?.error?.message ||
        (res.status === 503
          ? "ABR not configured on this server."
          : "ACN lookup failed.");
      setMessage({ tone: "err", text });
      return;
    }

    const identity = json?.data?.identity;
    const patch = (json?.data?.profilePatch ?? null) as BusinessProfilePatch | null;
    setProfilePatch(patch);
    setPreview({
      legalName: identity?.entity?.legalName,
      tradingNames: identity?.entity?.tradingNames,
      businessNames: identity?.entity?.businessNames,
      status: identity?.entity?.status,
      typeDescription: identity?.entity?.typeDescription,
      gstRegistered: identity?.entity?.gstRegistered,
      abn: identity?.identifiers?.abn,
      acn: identity?.identifiers?.acn,
      address: identity?.entity?.address,
    });
    if (identity?.identifiers?.abn) setAbn(identity.identifiers.abn);
    setMessage({
      tone: "ok",
      text: identity?.entity?.legalName
        ? `Matched — ${identity.entity.legalName}. Review below, then apply to Business Profile.`
        : "Matched. Review below, then apply to Business Profile.",
    });
  }

  async function searchByName() {
    const q = nameQuery.trim();
    if (q.length < 3) {
      setMessage({
        tone: "err",
        text: "Enter at least 3 characters to search by name.",
      });
      return;
    }
    if (!abrConfigured) {
      setMessage({
        tone: "err",
        text: "ABR not configured. Paste ABN_LOOKUP_GUID (or ABR_GUID) into server .env.local — never in the browser.",
      });
      return;
    }

    setSearchingName(true);
    setMessage(null);
    setNameMatches([]);
    clearResult();

    const res = await fetch(
      `/api/v1/business-identity/name?q=${encodeURIComponent(q)}`,
    );
    const json = await res.json().catch(() => null);
    setSearchingName(false);

    if (!res.ok) {
      setMessage({
        tone: "err",
        text:
          json?.data?.note ||
          json?.error?.message ||
          (res.status === 503
            ? "ABR not configured on this server."
            : "Name search failed."),
      });
      return;
    }

    const matches = (json?.data?.matches ?? []) as NameMatch[];
    setNameMatches(matches);
    setMessage({
      tone: matches.length ? "info" : "err",
      text: matches.length
        ? `${matches.length} ABR match${matches.length === 1 ? "" : "es"} — pick one to verify. Not name-availability.`
        : "No ABR entities matched that name.",
    });
  }

  async function applyToProfile() {
    if (!profilePatch || Object.keys(profilePatch).length === 0) {
      setMessage({
        tone: "err",
        text: "Verify an ABN or ACN first so there is something to apply.",
      });
      return;
    }

    setApplying(true);
    setMessage(null);
    const res = await fetch("/api/v1/org/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profilePatch),
    });
    const json = await res.json().catch(() => null);
    setApplying(false);

    if (!res.ok) {
      setMessage({
        tone: "err",
        text: json?.error?.message ?? "Could not save Business Profile.",
      });
      return;
    }

    setMessage({
      tone: "ok",
      text: "Applied to Business Profile. Identity fields are saved for every app to read.",
    });
    router.refresh();
  }

  const busy = lookingUp || searchingName || applying;

  return (
    <section
      id="identify"
      className="dg-card space-y-5 scroll-mt-24"
      aria-labelledby="identify-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
            Stage 1 · Identify
          </p>
          <h2 id="identify-heading" className="mt-1 text-xl font-bold text-white">
            Verify your business identity
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Look up ABN or ACN via the Australian Business Register, preview the
            entity, then apply fields to your Business Profile. This verifies —
            it does not register a business name.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${
            abrConfigured
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
              : "bg-amber-500/15 text-amber-200 ring-amber-500/30"
          }`}
        >
          {abrConfigured ? "ABR ready" : "ABR not configured"}
        </span>
      </div>

      {!abrConfigured ? (
        <Message tone="err">
          ABR not configured. Set{" "}
          <code className="text-rose-100">ABN_LOOKUP_GUID</code> or{" "}
          <code className="text-rose-100">ABR_GUID</code> in server{" "}
          <code className="text-rose-100">.env.local</code>, then restart. The
          GUID never appears in the UI.
        </Message>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["abn", "ABN"],
            ["acn", "ACN"],
            ["name", "Name search"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              mode === id
                ? "bg-sky-600 text-white"
                : "border border-slate-600 text-slate-300 hover:border-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "abn" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              ABN
            </span>
            <input
              className={`${inputClass} mt-1`}
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              placeholder="11 digits"
              inputMode="numeric"
              disabled={!abrConfigured || busy}
            />
          </label>
          <button
            type="button"
            onClick={() => verifyAbn()}
            disabled={!abrConfigured || busy}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {lookingUp ? "Verifying…" : "Verify ABN"}
          </button>
        </div>
      ) : null}

      {mode === "acn" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              ACN
            </span>
            <input
              className={`${inputClass} mt-1`}
              value={acn}
              onChange={(e) => setAcn(e.target.value)}
              placeholder="9 digits"
              inputMode="numeric"
              disabled={!abrConfigured || busy}
            />
          </label>
          <button
            type="button"
            onClick={verifyAcn}
            disabled={!abrConfigured || busy}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {lookingUp ? "Looking up…" : "Look up ACN"}
          </button>
        </div>
      ) : null}

      {mode === "name" ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Business name
              </span>
              <input
                className={`${inputClass} mt-1`}
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Existing entity name (min 3 chars)"
                disabled={!abrConfigured || busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void searchByName();
                  }
                }}
              />
            </label>
            <button
              type="button"
              onClick={searchByName}
              disabled={!abrConfigured || busy}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {searchingName ? "Searching…" : "Search ABR"}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Lists entities already on the ABR. Does not check whether a new name
            can be registered — that waits on the authorised registration pathway.
          </p>
          {nameMatches.length > 0 ? (
            <ul className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
              {nameMatches.map((m) => (
                <li key={m.abn}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setMode("abn");
                      setAbn(m.abn);
                      void verifyAbn(m.abn);
                    }}
                    className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-900/70 disabled:opacity-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {m.businessName}
                      </p>
                      <p className="text-xs text-slate-500">
                        ABN {m.abn}
                        {m.location ? ` · ${m.location}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-sky-400">Verify →</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {message ? <Message tone={message.tone}>{message.text}</Message> : null}

      {preview ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="text-sm font-semibold text-white">Entity preview</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Legal name</dt>
              <dd className="text-sm text-slate-200">
                {preview.legalName || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Status / type</dt>
              <dd className="text-sm text-slate-200">
                {[preview.status, preview.typeDescription]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">ABN</dt>
              <dd className="text-sm text-slate-200">{preview.abn || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">ACN</dt>
              <dd className="text-sm text-slate-200">{preview.acn || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">GST</dt>
              <dd className="text-sm text-slate-200">
                {preview.gstRegistered == null
                  ? "—"
                  : preview.gstRegistered
                    ? "Registered"
                    : "Not registered"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">State / postcode</dt>
              <dd className="text-sm text-slate-200">
                {[preview.address?.state, preview.address?.postcode]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </dd>
            </div>
            {preview.tradingNames?.length ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Trading names</dt>
                <dd className="text-sm text-slate-200">
                  {preview.tradingNames.join(", ")}
                </dd>
              </div>
            ) : null}
            {preview.businessNames?.length ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Business names on entity</dt>
                <dd className="text-sm text-slate-200">
                  {preview.businessNames.join(", ")}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyToProfile}
              disabled={applying || !profilePatch}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {applying ? "Saving…" : "Apply to Business Profile"}
            </button>
            <Link
              href="/dashboard/business"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              Open Business Profile
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-800/80 bg-slate-950/30 px-3 py-2 text-xs text-slate-500">
        <p>
          <span className="text-slate-400">Register</span> (business name /
          company) stays on the official pathway until provider approval — we
          never invent availability or claim a registration succeeded. Domains
          and digital presence stay under Establish / Connect.
        </p>
      </div>
    </section>
  );
}

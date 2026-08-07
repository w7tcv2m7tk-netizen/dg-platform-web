"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function formatAud(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export function ReferAndEarnPanel({
  shareUrl,
  code,
  metrics,
  referrals,
  stubsNote,
}: {
  shareUrl: string;
  code: string;
  metrics: {
    invited: number;
    signedUp: number;
    converted: number;
    active: number;
    monthlyRewardCents: number;
    lifetimeRewardCents: number;
    cashAvailableStubCents: number;
    cashPayoutThresholdCents: number;
  };
  referrals: Array<{
    id: string;
    status: string;
    inviteEmail?: string | null;
    inviteName?: string | null;
    referredOrganisationId?: string | null;
    createdAt: string;
  }>;
  stubsNote: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — select the link manually");
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/v1/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: name || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Invite failed");
      return;
    }
    setMessage(
      json.data?.resent
        ? "Invite already on file — link ready to share again."
        : "Invite queued (email provider stub — branded HTML prepared).",
    );
    setEmail("");
    setName("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(
          [
            ["Invited", metrics.invited],
            ["Signed up", metrics.signedUp],
            ["Converted (paid)", metrics.converted],
            ["Active rewards", metrics.active],
            ["This month", formatAud(metrics.monthlyRewardCents)],
            ["Lifetime credits", formatAud(metrics.lifetimeRewardCents)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="dg-card">
        <h2 className="font-semibold text-white">Your referral link</h2>
        <p className="mt-1 text-sm text-slate-400">
          Code <span className="font-mono text-slate-200">{code}</span> — share{" "}
          <code className="text-slate-300">/r/{code}</code>. Single-level only: you
          earn when <em>your</em> referred org pays — not their referrals.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="max-w-full truncate rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
            {shareUrl}
          </code>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>

      <div className="dg-card">
        <h2 className="font-semibold text-white">Email invite</h2>
        <p className="mt-1 text-sm text-slate-400">
          Sends a branded invite via the Communications stub (provider not live yet).
        </p>
        <form onSubmit={sendInvite} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-1">
            <span className="text-slate-400">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Name (optional)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send invite"}
            </button>
          </div>
        </form>
        {error ? <p className="mt-2 text-sm text-amber-400">{error}</p> : null}
        {message ? <p className="mt-2 text-sm text-emerald-400">{message}</p> : null}
      </div>

      <div className="dg-card">
        <h2 className="font-semibold text-white">Referrals</h2>
        {!referrals.length ? (
          <p className="mt-3 text-sm text-slate-400">
            No invites yet — copy your link or send an email invite.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-800">
            {referrals.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="text-white">
                    {r.inviteName || r.inviteEmail || r.referredOrganisationId || "Referral"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.inviteEmail ?? "—"} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString("en-AU")}
                  </p>
                </div>
                <span className="rounded-full border border-slate-600 px-3 py-0.5 text-xs capitalize text-slate-300">
                  {r.status.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dg-card border-dashed border-slate-700">
        <h2 className="font-semibold text-white">Rewards policy</h2>
        <p className="mt-2 text-sm text-slate-400">
          Earn <strong className="text-slate-200">20%</strong> of the referred
          organisation&apos;s subscription as <strong className="text-slate-200">platform credit</strong>{" "}
          for 12 months after they pay. Cash payout at{" "}
          {formatAud(metrics.cashPayoutThresholdCents)} is stubbed (
          {formatAud(metrics.cashAvailableStubCents)} available in ledger).
        </p>
        <p className="mt-2 text-xs text-slate-500">{stubsNote}</p>
      </div>
    </div>
  );
}

"use client";

import { REFER_AND_EARN_HREF } from "@dg/platform-core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatAud(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

type ReferralTier = "customer" | "partner" | "reseller";

type ConnectSnapshot = {
  configured: boolean;
  accountType: string;
  accountId: string | null;
  status: "not_started" | "pending" | "restricted" | "complete" | "disabled";
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  canRequestPayout: boolean;
  message: string;
};

function connectStatusLabel(status: ConnectSnapshot["status"]) {
  switch (status) {
    case "complete":
      return "Ready for payouts";
    case "pending":
      return "Onboarding in progress";
    case "restricted":
      return "Action required";
    case "disabled":
      return "Disabled";
    default:
      return "Not connected";
  }
}

export function ReferAndEarnPanel({
  shareUrl,
  code,
  metrics,
  referrals,
  stubsNote,
  programme,
  connect,
  canEditTier = false,
  canManageConnect = false,
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
    cashAvailableCents?: number;
    cashAvailableStubCents: number;
    cashPayoutThresholdCents: number;
    commissionBps?: number;
    tier?: ReferralTier;
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
  programme?: {
    tier: ReferralTier;
    commissionBps: number;
    label: string;
  };
  connect: ConnectSnapshot;
  canEditTier?: boolean;
  canManageConnect?: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [cashPending, setCashPending] = useState(false);
  const [connectPending, setConnectPending] = useState(false);
  const [tierPending, setTierPending] = useState(false);
  const [tier, setTier] = useState<ReferralTier>(
    programme?.tier ?? metrics.tier ?? "customer",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cashAvailable =
    metrics.cashAvailableCents ?? metrics.cashAvailableStubCents;
  const canRequestCash =
    connect.configured &&
    connect.canRequestPayout &&
    cashAvailable >= metrics.cashPayoutThresholdCents;
  const commissionBps =
    programme?.commissionBps ?? metrics.commissionBps ?? 2000;
  const commissionPct = (commissionBps / 100).toFixed(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectParam = params.get("connect");
    if (connectParam !== "return" && connectParam !== "refresh") return;

    void (async () => {
      setConnectPending(true);
      setError(null);
      try {
        await fetch("/api/v1/referrals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "connect_sync" }),
        });
        setMessage(
          connectParam === "return"
            ? "Stripe Connect status updated."
            : "Onboarding link expired — start Connect again if needed.",
        );
        router.replace(REFER_AND_EARN_HREF);
        router.refresh();
      } catch {
        setError("Could not refresh Connect status");
      } finally {
        setConnectPending(false);
      }
    })();
  }, [router]);

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
    const delivery = json.data?.delivery;
    const resent = json.data?.resent;
    if (delivery?.status === "sent") {
      setMessage(resent ? "Invite re-sent via email." : "Invite email sent.");
    } else if (delivery?.queued || delivery?.status === "queued") {
      setMessage(
        resent
          ? "Invite already on file — branded email re-queued (set RESEND_API_KEY for live delivery)."
          : "Invite queued with branded HTML (set RESEND_API_KEY for live email delivery).",
      );
    } else {
      setMessage(
        resent
          ? "Invite already on file — link ready to share again."
          : "Invite created.",
      );
    }
    setEmail("");
    setName("");
    router.refresh();
  }

  async function startConnectOnboarding() {
    setConnectPending(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/v1/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect_onboarding" }),
    });
    const json = await res.json().catch(() => ({}));
    setConnectPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not start bank onboarding");
      return;
    }
    if (json.data?.url) {
      window.location.href = json.data.url as string;
      return;
    }
    setError("Stripe did not return an onboarding URL");
  }

  async function requestCashPayout() {
    setCashPending(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/v1/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cash_payout" }),
    });
    const json = await res.json().catch(() => ({}));
    setCashPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Cash payout unavailable");
      return;
    }
    setMessage(
      `Cash payout of ${formatAud(json.data?.amountCents ?? 0)} sent to your connected bank account via Stripe.`,
    );
    router.refresh();
  }

  async function saveTier() {
    setTierPending(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/v1/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_referral_tier", tier }),
    });
    const json = await res.json().catch(() => ({}));
    setTierPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not update tier");
      return;
    }
    setMessage(`Referral tier updated to ${json.data?.label ?? tier}. New invites use this rate.`);
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
        <h2 className="font-semibold text-white">Referrer tier</h2>
        <p className="mt-1 text-sm text-slate-400">
          Current rate{" "}
          <strong className="text-slate-200">{commissionPct}%</strong>
          {programme?.label ? ` · ${programme.label}` : ""}. Applies to new
          referrals (existing rows keep their stored commission).
        </p>
        {canEditTier ? (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="text-slate-400">Tier</span>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as ReferralTier)}
                className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="customer">Customer — 20%</option>
                <option value="partner">Partner — 25%</option>
                <option value="reseller">Reseller — 25%</option>
              </select>
            </label>
            <button
              type="button"
              disabled={tierPending}
              onClick={() => void saveTier()}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500 disabled:opacity-50"
            >
              {tierPending ? "Saving…" : "Save tier"}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            Ask an org owner/admin to change Partner or Reseller rates.
          </p>
        )}
      </div>

      <div className="dg-card">
        <h2 className="font-semibold text-white">Email invite</h2>
        <p className="mt-1 text-sm text-slate-400">
          Delivers via Resend when configured; otherwise queues a branded email on the
          organisation timeline.
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
        <h2 className="font-semibold text-white">Cash payout</h2>
        <p className="mt-1 text-sm text-slate-400">
          Available {formatAud(cashAvailable)} · threshold{" "}
          {formatAud(metrics.cashPayoutThresholdCents)}. Platform credit is the
          default reward; cash is optional once you hit the threshold.
        </p>

        {!connect.configured ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/60 px-3 py-3 text-sm text-slate-400">
            {connect.message}
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full border border-slate-600 px-3 py-0.5 text-xs text-slate-300">
                Stripe {connect.accountType} · {connectStatusLabel(connect.status)}
              </span>
              {connect.accountId ? (
                <span className="font-mono text-xs text-slate-500">
                  {connect.accountId}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-slate-400">{connect.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {canManageConnect &&
              (!connect.canRequestPayout || connect.status !== "complete") ? (
                <button
                  type="button"
                  disabled={connectPending}
                  onClick={() => void startConnectOnboarding()}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {connectPending
                    ? "Opening Stripe…"
                    : connect.status === "not_started"
                      ? "Connect bank account"
                      : "Continue Stripe onboarding"}
                </button>
              ) : null}
              <button
                type="button"
                disabled={!canRequestCash || cashPending}
                onClick={() => void requestCashPayout()}
                className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {cashPending
                  ? "Sending…"
                  : canRequestCash
                    ? `Request cash payout (${formatAud(cashAvailable)})`
                    : !connect.canRequestPayout
                      ? "Connect bank account to cash out"
                      : `Need ${formatAud(metrics.cashPayoutThresholdCents)} to cash out`}
              </button>
            </div>
            {!canManageConnect && !connect.canRequestPayout ? (
              <p className="mt-3 text-xs text-slate-500">
                Ask an org owner/admin to complete Stripe Connect onboarding.
              </p>
            ) : null}
          </>
        )}
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
          Earn <strong className="text-slate-200">{commissionPct}%</strong> of the
          referred organisation&apos;s subscription as{" "}
          <strong className="text-slate-200">platform credit</strong> for 12 months
          after they pay. Optional cash payout at{" "}
          {formatAud(metrics.cashPayoutThresholdCents)} via Stripe Connect (
          {formatAud(cashAvailable)} available). Single-level only — not multi-level
          marketing.
        </p>
        <p className="mt-2 text-xs text-slate-500">{stubsNote}</p>
      </div>
    </div>
  );
}

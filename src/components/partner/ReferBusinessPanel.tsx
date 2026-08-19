"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "link" | "warm";

export function ReferBusinessPanel({
  partnerId,
  referralCode,
  referralUrl,
}: {
  partnerId: string;
  referralCode: string;
  referralUrl: string;
}) {
  const [tab, setTab] = useState<Tab>("link");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function copyLink() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-6">
      <h3 className="mb-4 text-base font-semibold text-white">Refer a Business</h3>

      {/* Tab switcher */}
      <div className="mb-6 flex rounded-lg border border-slate-700 bg-slate-800 p-1 text-sm">
        <button
          onClick={() => setTab("link")}
          className={`flex-1 rounded-md px-3 py-2 font-medium transition-colors ${
            tab === "link"
              ? "bg-sky-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Option A — Referral Link
        </button>
        <button
          onClick={() => setTab("warm")}
          className={`flex-1 rounded-md px-3 py-2 font-medium transition-colors ${
            tab === "warm"
              ? "bg-sky-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Option B — Warm Introduction
        </button>
      </div>

      {tab === "link" ? (
        <LinkTab referralUrl={referralUrl} referralCode={referralCode} copied={copied} onCopy={copyLink} />
      ) : (
        <WarmIntroTab partnerId={partnerId} referralCode={referralCode} onSuccess={() => router.push("/partner/referrals")} />
      )}
    </div>
  );
}

function LinkTab({
  referralUrl,
  referralCode,
  copied,
  onCopy,
}: {
  referralUrl: string;
  referralCode: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        Share your unique referral link. When a business applies via this link, the referral is
        automatically attributed to you.
      </p>
      <div className="flex items-center gap-3 rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-3">
        <span className="flex-1 break-all font-mono text-sm text-slate-300">{referralUrl}</span>
        <button
          onClick={onCopy}
          className="shrink-0 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Your code: <span className="font-mono text-slate-300">{referralCode}</span>
      </p>
    </div>
  );
}

function WarmIntroTab({
  partnerId,
  referralCode,
  onSuccess,
}: {
  partnerId: string;
  referralCode: string;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");
    setError("");

    const form = new FormData(e.currentTarget);
    const body = {
      partnerId,
      referralCode,
      businessName: form.get("businessName") as string,
      contactName: form.get("contactName") as string,
      email: form.get("email") as string,
      phone: form.get("phone") as string,
      website: form.get("website") as string,
      industry: form.get("industry") as string,
      notes: form.get("notes") as string,
    };

    const res = await fetch("/api/v1/partner/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error?.message || "Could not submit referral. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("done");
    setTimeout(onSuccess, 800);
  }

  if (status === "done") {
    return (
      <div className="rounded-lg border border-emerald-600/30 bg-emerald-900/20 px-5 py-4 text-sm text-emerald-300">
        Referral received. DigitalGate will review and follow up.
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <p className="text-sm text-slate-300">
        Submit a warm introduction directly. Ben will review and follow up with the business.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Business Name *" name="businessName" required placeholder="Acme Property Group" />
        <Field label="Contact Name" name="contactName" placeholder="Jane Smith" />
        <Field label="Email" name="email" type="email" placeholder="jane@acme.com.au" />
        <Field label="Phone" name="phone" type="tel" placeholder="+61 4xx xxx xxx" />
        <Field label="Website" name="website" type="url" placeholder="https://acme.com.au" />
        <Field label="Industry" name="industry" placeholder="Real Estate, Hospitality…" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Notes</label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Why are you introducing this business? Any relevant context…"
          className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
      >
        {status === "saving" ? "Submitting…" : "Submit Warm Introduction"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
      />
    </div>
  );
}

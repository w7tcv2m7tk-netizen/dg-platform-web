"use client";

import Link from "next/link";
import { useState } from "react";
import { PlanPicker } from "@/components/PlanPicker";
import { AuPhoneInput } from "@/components/ui/AuPhoneInput";
import type { SignupSelection } from "@/lib/plans";

export function SignupForm() {
  const [step, setStep] = useState<"plan" | "details" | "done">("plan");
  const [selection, setSelection] = useState<SignupSelection | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [abn, setAbn] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [industryLicenseNumber, setIndustryLicenseNumber] = useState("");

  async function submitDetails() {
    if (!selection?.platformTier) return;
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          abn: abn || undefined,
          gst_number: gstNumber || undefined,
          industry_license_number: industryLicenseNumber || undefined,
          industry_vertical: selection.industryApps[0] ?? "",
          platform_tier: selection.platformTier,
          purchased_apps: selection.industryApps,
          purchased_premium: selection.premiumApps,
          purchased_addons: selection.addons,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Submission failed");
      }
      setStep("done");
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <h2 className="text-xl font-semibold text-white">Details received</h2>
        <p className="mt-2 text-slate-300">
          Your plan selection is saved. Create your account using the same email address, or log in
          if you already have an account. DigitalGate will then take you to your dashboard to
          continue setup.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup/account"
            className="inline-flex min-h-11 items-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Create account →
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-full border border-slate-600 px-6 text-sm font-semibold text-slate-200 hover:border-slate-500"
          >
            Log in →
          </Link>
        </div>
      </div>
    );
  }

  if (step === "details" && selection) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Your details</h2>
        <input
          className="dg-input min-h-11"
          placeholder="Business name *"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
        <input
          className="dg-input min-h-11"
          placeholder="Contact name *"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
        <input
          className="dg-input min-h-11"
          type="email"
          placeholder="Email *"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        <AuPhoneInput
          className="dg-input min-h-11"
          placeholder="Phone"
          value={contactPhone}
          onValueChange={setContactPhone}
        />
        <input
          className="dg-input min-h-11"
          placeholder="ABN (optional)"
          value={abn}
          onChange={(e) => setAbn(e.target.value)}
        />
        <input
          className="dg-input min-h-11"
          placeholder="GST number (optional)"
          value={gstNumber}
          onChange={(e) => setGstNumber(e.target.value)}
        />
        <input
          className="dg-input min-h-11"
          placeholder="Industry licence number (optional)"
          value={industryLicenseNumber}
          onChange={(e) => setIndustryLicenseNumber(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep("plan")}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-600 px-5 text-sm text-slate-300"
          >
            Back
          </button>
          <button
            type="button"
            disabled={
              status === "loading" ||
              !businessName ||
              !contactName ||
              !contactEmail
            }
            onClick={submitDetails}
            className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
          >
            {status === "loading" ? "Submitting…" : "Submit plan selection"}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Saved securely to DigitalGate. Create an account after submitting to access your
          dashboard.
        </p>
      </div>
    );
  }

  return (
    <PlanPicker
      onContinue={(sel) => {
        setSelection(sel);
        setStep("details");
      }}
    />
  );
}

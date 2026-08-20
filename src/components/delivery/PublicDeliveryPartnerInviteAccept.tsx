"use client";

import { useState } from "react";
import { DELIVERY_PARTNER_INVITE_POINTS } from "@dg/platform-core";

export function PublicDeliveryPartnerInviteAccept({
  token,
  firstName,
  businessName,
  invitedByName,
  deliveryRole,
  withdrawn,
  alreadyAccepted,
}: {
  token: string;
  firstName: string;
  businessName: string;
  invitedByName: string;
  deliveryRole: "lead" | "member";
  withdrawn?: boolean;
  alreadyAccepted?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    alreadyAccepted ? "done" : "idle",
  );
  const [message, setMessage] = useState("");
  const [portalUrl, setPortalUrl] = useState("https://app.digitalgate.com.au/partner/delivery");
  const roleLabel = deliveryRole === "lead" ? "Delivery Manager" : "Delivery Partner";

  async function accept() {
    setStatus("saving");
    setMessage("");
    const res = await fetch("/api/public/partner-invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error?.message || "Could not accept this invitation.");
      return;
    }
    const next =
      typeof json.data?.portalUrl === "string" ? json.data.portalUrl : portalUrl;
    setPortalUrl(next);
    setStatus("done");
    window.location.assign(next);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
        Delivery Partner invitation
      </p>
      <h1 className="mt-3 text-3xl font-bold text-white">
        You&apos;ve been personally invited by {invitedByName} to join DigitalGate Delivery
        as a {roleLabel}.
      </h1>
      {withdrawn ? (
        <p className="mt-4 text-amber-200">This invitation is no longer active.</p>
      ) : alreadyAccepted || status === "done" ? (
        <p className="mt-4 text-slate-300">
          Invitation accepted. Sign in to the Delivery workspace to continue. DigitalGate
          still approves you into the programme.
        </p>
      ) : (
        <>
          <p className="mt-4 text-slate-300">
            Hi {firstName}. {businessName} is a strong fit for the founding Delivery team —
            the partners who onboard customers onto DigitalGate. Accepting this invitation
            starts partner setup.
          </p>
          <h2 className="mt-8 text-lg font-semibold text-white">How Delivery Partners work</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
            {DELIVERY_PARTNER_INVITE_POINTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        {!withdrawn && status !== "done" ? (
          <button
            type="button"
            onClick={() => void accept()}
            disabled={status === "saving"}
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {status === "saving" ? "Accepting…" : "Accept Delivery Partner Invitation →"}
          </button>
        ) : (
          <a
            href={portalUrl}
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Open Delivery workspace →
          </a>
        )}
        <a
          href="/founding-customers"
          className="rounded-full border border-slate-500 px-5 py-2.5 text-sm font-semibold text-white hover:border-emerald-400"
        >
          About DigitalGate
        </a>
      </div>
      {message ? <p className="mt-4 text-sm text-amber-300">{message}</p> : null}
    </div>
  );
}

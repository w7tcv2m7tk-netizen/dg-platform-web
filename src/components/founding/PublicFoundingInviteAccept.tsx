"use client";

import { useState } from "react";
import { FOUNDING_PERSONAL_INVITE_BENEFITS } from "@dg/platform-core";

export function parseFoundingInvitePageSlug(pageSlug?: string): string | null {
  const match = (pageSlug || "").trim().match(/^founding-customers\/invite\/([^/]+)$/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function PublicFoundingInviteAccept({
  token,
  firstName,
  businessName,
  invitedByName,
  withdrawn,
  alreadyAccepted,
  alreadyInProgramme,
}: {
  token: string;
  firstName: string;
  businessName: string;
  invitedByName: string;
  withdrawn?: boolean;
  alreadyAccepted?: boolean;
  alreadyInProgramme?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    alreadyAccepted || alreadyInProgramme ? "done" : "idle",
  );
  const [message, setMessage] = useState("");
  const consult = "https://digitalgate.com.au/strategy-session";

  async function accept() {
    setStatus("saving");
    setMessage("");
    const res = await fetch("/api/public/founding-invite/accept", {
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
    setStatus("done");
    const next = typeof json.data?.consultationUrl === "string" ? json.data.consultationUrl : consult;
    window.location.assign(next);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
        Founding 10 invitation
      </p>
      <h1 className="mt-3 text-3xl font-bold text-white">
        You&apos;ve been personally invited by {invitedByName} to join DigitalGate&apos;s Founding 10.
      </h1>
      {withdrawn ? (
        <p className="mt-4 text-amber-200">This invitation is no longer active.</p>
      ) : alreadyInProgramme ? (
        <p className="mt-4 text-slate-300">
          {businessName} is already in the Founding 10. Continue setup in the app.
        </p>
      ) : alreadyAccepted || status === "done" ? (
        <p className="mt-4 text-slate-300">
          Invitation accepted. Next is a short Platform Consultation — not automatic
          acceptance into the 10.
        </p>
      ) : (
        <>
          <p className="mt-4 text-slate-300">
            Hi {firstName}. After our conversation, {businessName} looks like a strong fit
            for the first cohort. Accepting this invitation starts consultation and
            onboarding — it does not yet count as one of the 10 places.
          </p>
          <h2 className="mt-8 text-lg font-semibold text-white">Founding 10 benefits</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
            {FOUNDING_PERSONAL_INVITE_BENEFITS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        {!withdrawn && !alreadyInProgramme && status !== "done" ? (
          <button
            type="button"
            onClick={() => void accept()}
            disabled={status === "saving"}
            className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {status === "saving" ? "Accepting…" : "Accept Founding 10 Invitation →"}
          </button>
        ) : (
          <a
            href={consult}
            className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Book Platform Consultation →
          </a>
        )}
        <a
          href="/founding-customers"
          className="rounded-full border border-slate-500 px-5 py-2.5 text-sm font-semibold text-white hover:border-sky-400"
        >
          About Founding 10
        </a>
      </div>
      {message ? <p className="mt-4 text-sm text-amber-300">{message}</p> : null}
    </div>
  );
}

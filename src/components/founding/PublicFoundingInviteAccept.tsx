"use client";

import { useState } from "react";
import { FOUNDING_PERSONAL_INVITE_BENEFITS } from "@dg/platform-core";

export { parseFoundingInvitePageSlug } from "@/lib/founding-invite-page-slug";

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
    window.location.assign(`/founding/agreement?invite=${encodeURIComponent(token)}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
        Founding 10 invitation
      </p>
      <h1 className="mt-3 text-3xl font-bold text-white">
        You&apos;ve been personally invited by {invitedByName}{" "}to join DigitalGate&apos;s Founding 10.
      </h1>
      {withdrawn ? (
        <p className="mt-4 text-amber-200">This invitation is no longer active.</p>
      ) : alreadyInProgramme ? (
        <p className="mt-4 text-slate-300">
          {businessName} is already in the Founding 10. Continue setup in the app.
        </p>
      ) : alreadyAccepted || status === "done" ? (
        <p className="mt-4 text-slate-300">
          Invitation accepted. Continue to confirm the Founding 10 terms and start your 14-day trial.
        </p>
      ) : (
        <>
          <p className="mt-4 text-slate-300">
            Hi {firstName}. {businessName} has been invited to join DigitalGate&apos;s Founding 10. Accept your invitation to continue straight into setup and your 14-day free trial.
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
            href={`/founding/agreement?invite=${encodeURIComponent(token)}`} 
            className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Continue setup →
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

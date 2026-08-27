"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  FOUNDING_SOURCE_LABELS,
  FOUNDING_SOURCES,
  type FoundingSource,
} from "@dg/platform-core";

export function InviteToFounding10Form({
  contactId,
  defaultName,
  defaultEmail,
  defaultPhone,
  defaultBusinessName,
  compact,
}: {
  contactId?: string;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  defaultBusinessName?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const [source, setSource] = useState<FoundingSource>(
    contactId ? "existing_contact" : "direct_invitation",
  );
  const [name, setName] = useState(defaultName ?? "");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [businessName, setBusinessName] = useState(defaultBusinessName ?? "");

  async function create(send: boolean) {
    setStatus("saving");
    setMessage("");
    const res = await fetch("/api/v1/founding/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: defaultPhone,
        businessName: businessName.trim() || undefined,
        source,
        send,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error?.message || "Could not create invitation");
      return;
    }
    const opportunityId = json.data?.opportunityId as string | undefined;
    setStatus("idle");
    if (opportunityId) {
      router.push(`/apps/crm/opportunities/${opportunityId}`);
      return;
    }
    router.refresh();
  }

  return (
    <div className={compact ? "space-y-3" : "dg-card space-y-3"}>
      <h2 className="font-semibold text-white">Invite to Founding 10</h2>
      <p className="text-sm text-slate-400">
        Customers can enter through public application or personal invitation. Both paths enter
        the same Founding 10 qualification pipeline. Sending an invite does not use a seat.
      </p>
      {!contactId ? (
        <>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </>
      ) : null}
      <input
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        placeholder="Business name"
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
      />
      <select
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        value={source}
        onChange={(e) => setSource(e.target.value as FoundingSource)}
      >
        {FOUNDING_SOURCES.filter((id) => id !== "public_application").map((id) => (
          <option key={id} value={id}>
            {FOUNDING_SOURCE_LABELS[id]}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
          disabled={status === "saving"}
          onClick={() => void create(true)}
        >
          Send invitation
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200"
          disabled={status === "saving"}
          onClick={() => void create(false)}
        >
          Create invitation record
        </button>
      </div>
      {message ? <p className="text-sm text-amber-300">{message}</p> : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InviteDeliveryPartnerForm({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [deliveryRole, setDeliveryRole] = useState<"member" | "lead">("member");

  async function create(send: boolean) {
    setStatus("saving");
    setMessage("");
    const res = await fetch("/api/v1/partners/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "delivery_partner",
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        businessName: businessName.trim() || undefined,
        deliveryRole,
        send,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error?.message || "Could not create invitation");
      return;
    }
    const partnerId = json.data?.partnerId as string | undefined;
    setStatus("idle");
    setName("");
    setEmail("");
    setBusinessName("");
    setDeliveryRole("member");
    if (partnerId) {
      router.push(`/command/partners/${partnerId}`);
      return;
    }
    router.refresh();
  }

  return (
    <div className={compact ? "space-y-3" : "dg-card space-y-3"}>
      <h2 className="font-semibold text-white">Invite Delivery Partner</h2>
      <p className="text-sm text-slate-400">
        Personal invitation into DigitalGate Delivery. Delivery Partners onboard customers —
        they are not Founding Resellers. Sending an invite does not approve them into the
        programme.
      </p>
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
      <input
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        placeholder="Business / practice name"
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
      />
      <label className="block text-xs font-medium text-slate-400">
        Role
        <select
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          value={deliveryRole}
          onChange={(e) => setDeliveryRole(e.target.value === "lead" ? "lead" : "member")}
        >
          <option value="member">Delivery Partner (member)</option>
          <option value="lead">Delivery Manager (lead)</option>
        </select>
      </label>
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

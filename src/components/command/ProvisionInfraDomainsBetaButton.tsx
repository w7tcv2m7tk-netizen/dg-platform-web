"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProvisionInfraDomainsBetaButton({
  organisationId,
  organisationName,
  alreadyBeta,
}: {
  organisationId: string;
  organisationName: string;
  alreadyBeta?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (alreadyBeta) {
    return (
      <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
        Domains beta
      </span>
    );
  }

  async function provision() {
    if (
      !window.confirm(
        `Enable Domains beta for ${organisationName}? Sets infra.domains_beta and installs Infrastructure. Does NOT enable paid register.`,
      )
    ) {
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/command/infra-domains-beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error?.message || `Failed (${res.status})`);
      }
      setMessage("Enabled");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void provision()}
        className="rounded-md border border-violet-600/50 px-2 py-0.5 text-xs font-medium text-violet-300 hover:bg-violet-500/10 disabled:opacity-50"
      >
        {pending ? "…" : "Enable Domains beta"}
      </button>
      {message ? <span className="text-[10px] text-slate-500">{message}</span> : null}
    </div>
  );
}

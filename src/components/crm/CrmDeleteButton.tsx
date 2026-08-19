"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type CrmDeleteResource = "contacts" | "companies" | "opportunities";

const ACTION: Record<CrmDeleteResource, string> = {
  contacts: "Delete contact",
  companies: "Delete company",
  opportunities: "Delete opportunity",
};

const CONFIRM: Record<CrmDeleteResource, (name: string) => string> = {
  contacts: (name) =>
    `Remove ${name} from CRM? They will disappear from lists. Properties stay; owner links are cleared.`,
  companies: (name) =>
    `Remove ${name} from CRM? Linked contacts stay, but this company is unlinked.`,
  opportunities: (name) =>
    `Delete ${name}? This CRM opportunity and its linked enquiry will be removed. Command Centre Opportunities are not affected.`,
};

export function CrmDeleteButton({
  resource,
  id,
  name,
  redirectTo,
  compact = false,
}: {
  resource: CrmDeleteResource;
  id: string;
  name: string;
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm(CONFIRM[resource](name))) return;

    setPending(true);
    setError(null);
    const res = await fetch(`/api/v1/${resource}/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      setError(json.error?.message ?? "Could not delete");
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
    }
    router.refresh();
  }

  return (
    <div className={compact ? "shrink-0" : "mt-4"}>
      <button
        type="button"
        onClick={() => void onDelete()}
        disabled={pending}
        className={
          compact
            ? "text-xs text-rose-400 hover:text-rose-300 disabled:opacity-50"
            : "rounded-full border border-rose-600/60 px-3 py-1.5 text-sm text-rose-300 hover:border-rose-500 disabled:opacity-50"
        }
      >
        {pending ? "Deleting…" : compact ? "Delete" : ACTION[resource]}
      </button>
      {error ? <p className="mt-1 text-xs text-amber-400">{error}</p> : null}
    </div>
  );
}

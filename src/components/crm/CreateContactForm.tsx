"use client";

import { useRouter } from "next/navigation";

import { CompanySelect } from "@/components/crm/CompanySelect";
import { usePendingAction } from "@/hooks/usePendingAction";

export function CreateContactForm({
  companies = [],
}: {
  companies?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { pending, error, setError, run, startTransition } = usePendingAction();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    await run(async () => {
      const res = await fetch("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.get("firstName"),
          lastName: data.get("lastName") || undefined,
          email: data.get("email") || undefined,
          phone: data.get("phone") || undefined,
          source: data.get("source") || "manual",
          companyId: data.get("companyId") || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const message = json?.error?.message ?? "Failed to create contact";
        setError(message);
        throw new Error(message);
      }

      const json = await res.json().catch(() => null);
      const contactId = json?.data?.id as string | undefined;

      form.reset();
      // Navigate / refresh without waiting for a blocking spinner cycle.
      startTransition(() => {
        if (contactId) {
          router.push(`/apps/crm/contacts/${contactId}`);
        } else {
          router.refresh();
        }
      });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="text-sm text-slate-400">First name *</span>
          <input
            name="firstName"
            required
            className="dg-input mt-1"
            placeholder="Jane"
          />
        </label>
        <label className="block min-w-0">
          <span className="text-sm text-slate-400">Last name</span>
          <input
            name="lastName"
            className="dg-input mt-1"
            placeholder="Smith"
          />
        </label>
        <label className="block min-w-0">
          <span className="text-sm text-slate-400">Email</span>
          <input
            name="email"
            type="email"
            className="dg-input mt-1"
            placeholder="jane@example.com"
            autoComplete="email"
          />
        </label>
        <label className="block min-w-0">
          <span className="text-sm text-slate-400">Phone</span>
          <input
            name="phone"
            className="dg-input mt-1"
            placeholder="+61 400 000 000"
            autoComplete="tel"
          />
        </label>
      </div>
      {companies.length > 0 ? (
        <CompanySelect companies={companies} />
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="dg-btn dg-btn-primary"
      >
        {pending ? "Saving…" : "Add contact"}
      </button>
    </form>
  );
}

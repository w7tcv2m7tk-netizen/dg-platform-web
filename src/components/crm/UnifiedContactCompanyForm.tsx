"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuPhoneInput } from "@/components/ui/AuPhoneInput";
import { usePendingAction } from "@/hooks/usePendingAction";

type CompanyOption = { id: string; name: string };
type CompanyMode = "none" | "existing" | "new";

export function UnifiedContactCompanyForm({
  companies = [],
  canCreateCompany = false,
  canSelectCompany = false,
}: {
  companies?: CompanyOption[];
  canCreateCompany?: boolean;
  canSelectCompany?: boolean;
}) {
  const router = useRouter();
  const [companyMode, setCompanyMode] = useState<CompanyMode>("none");
  const { pending, error, setError, run, startTransition } = usePendingAction();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    await run(async () => {
      let companyId =
        companyMode === "existing" ? String(data.get("companyId") ?? "").trim() : "";
      let createdCompanyName: string | null = null;

      if (companyMode === "new") {
        const companyName = String(data.get("companyName") ?? "").trim();
        if (!companyName) {
          const message = "Company name is required when creating a new company";
          setError(message);
          throw new Error(message);
        }

        const existingMatch = companies.find(
          (company) => company.name.trim().toLowerCase() === companyName.toLowerCase(),
        );

        if (existingMatch) {
          companyId = existingMatch.id;
        } else {
          const companyRes = await fetch("/api/v1/companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: companyName,
              industry: data.get("companyIndustry") || undefined,
              website: data.get("companyWebsite") || undefined,
              email: data.get("companyEmail") || undefined,
              phone: data.get("companyPhone") || undefined,
            }),
          });

          if (!companyRes.ok) {
            const json = await companyRes.json().catch(() => null);
            const message = json?.error?.message ?? "Failed to create company";
            setError(message);
            throw new Error(message);
          }

          const json = await companyRes.json().catch(() => null);
          companyId = String(json?.data?.id ?? "").trim();
          createdCompanyName = companyName;

          if (!companyId) {
            const message = "Company was created but no company ID was returned";
            setError(message);
            throw new Error(message);
          }
        }
      }

      const res = await fetch("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.get("firstName"),
          lastName: data.get("lastName") || undefined,
          email: data.get("email") || undefined,
          phone: data.get("phone") || undefined,
          source: data.get("source") || "manual",
          companyId: companyId || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const baseMessage = json?.error?.message ?? "Failed to create contact";
        const message = createdCompanyName
          ? `${baseMessage}. Company “${createdCompanyName}” was created; retry and select it as an existing company.`
          : baseMessage;
        setError(message);
        throw new Error(message);
      }

      const json = await res.json().catch(() => null);
      const contactId = json?.data?.id as string | undefined;

      form.reset();
      setCompanyMode("none");
      startTransition(() => {
        if (contactId) {
          router.push(`/apps/crm/contacts/${contactId}`);
        } else {
          router.refresh();
        }
      });
    });
  }

  const canUseExistingCompany = canSelectCompany && companies.length > 0;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
          <input name="lastName" className="dg-input mt-1" placeholder="Smith" />
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
          <AuPhoneInput
            name="phone"
            className="dg-input mt-1"
            placeholder="0412 345 678"
          />
        </label>
      </div>

      {(canUseExistingCompany || canCreateCompany) && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div>
            <p className="text-sm font-medium text-white">Company</p>
            <p className="mt-1 text-xs text-slate-500">
              Link this contact to an existing company or create the company without leaving this
              form.
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCompanyMode("none")}
              className={
                companyMode === "none"
                  ? "rounded-full bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500"
              }
            >
              No company
            </button>
            {canUseExistingCompany ? (
              <button
                type="button"
                onClick={() => setCompanyMode("existing")}
                className={
                  companyMode === "existing"
                    ? "rounded-full bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white"
                    : "rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500"
                }
              >
                Existing company
              </button>
            ) : null}
            {canCreateCompany ? (
              <button
                type="button"
                onClick={() => setCompanyMode("new")}
                className={
                  companyMode === "new"
                    ? "rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                    : "rounded-full border border-blue-500/50 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:border-blue-400"
                }
              >
                + New company
              </button>
            ) : null}
          </div>

          {companyMode === "existing" && canUseExistingCompany ? (
            <label className="mt-4 block">
              <span className="text-sm text-slate-400">Existing company</span>
              <select name="companyId" className="dg-input mt-1" defaultValue="">
                <option value="">Select company…</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {companyMode === "new" && canCreateCompany ? (
            <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
              <label className="block">
                <span className="text-sm text-slate-400">Company name *</span>
                <input
                  name="companyName"
                  required={companyMode === "new"}
                  className="dg-input mt-1"
                  placeholder="Acme Pty Ltd"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className="text-sm text-slate-400">Industry</span>
                  <input
                    name="companyIndustry"
                    className="dg-input mt-1"
                    placeholder="Real estate"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="text-sm text-slate-400">Website</span>
                  <input
                    name="companyWebsite"
                    className="dg-input mt-1"
                    placeholder="https://"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="text-sm text-slate-400">Company email</span>
                  <input name="companyEmail" type="email" className="dg-input mt-1" />
                </label>
                <label className="block min-w-0">
                  <span className="text-sm text-slate-400">Company phone</span>
                  <AuPhoneInput
                    name="companyPhone"
                    className="dg-input mt-1"
                    placeholder="07 5555 5555"
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button type="submit" disabled={pending} className="dg-btn dg-btn-primary">
        {pending ? "Saving…" : "Add contact"}
      </button>
    </form>
  );
}

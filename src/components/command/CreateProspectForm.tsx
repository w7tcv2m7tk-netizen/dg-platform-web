"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BusinessIdentityRecord } from "@dg/platform-core";
import { fetchProspectIdentity, ProspectBusinessSearch, type ProspectBusinessSelection } from "@/components/prospecting/ProspectBusinessSearch";

const empty = { businessName: "", abn: "", contactName: "", contactEmail: "", contactPhone: "", industry: "", location: "", websiteUrl: "" };
const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white";

export function CreateProspectForm({ pipelineHref = "/apps/prospecting/pipeline" }: { pipelineHref?: string } = {}) {
  const router = useRouter();
  const [fields, setFields] = useState(empty);
  const [identity, setIdentity] = useState<BusinessIdentityRecord | null>(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [googlePlaceId, setGooglePlaceId] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectBusiness(business: ProspectBusinessSelection) {
    setFields({ ...empty, businessName: business.businessName, abn: business.abn || "", location: business.location || "", contactPhone: business.phone || "", websiteUrl: business.websiteUrl || "" });
    setIdentity(business.identity || null);
    setIdentityConfirmed(false);
    setGooglePlaceId(business.googlePlaceId);
    setError(null);
  }

  async function verifyAbn() {
    setPending(true); setError(null); setIdentity(null); setIdentityConfirmed(false);
    try {
      const verified = await fetchProspectIdentity(fields.abn);
      setIdentity(verified);
      setFields((current) => ({ ...current, abn: verified.identifiers.abn || current.abn }));
    } catch (error) { setError(error instanceof Error ? error.message : "ABR verification failed"); }
    finally { setPending(false); }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fields.abn && (!identity || identity.identifiers.abn !== fields.abn || !identityConfirmed)) {
      setError("Verify the ABN and confirm the registry identity before adding this prospect."); return;
    }
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/v1/command/growth/prospects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, abn: fields.abn || undefined, googlePlaceId }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error?.message || "Could not create prospect");
      setFields(empty); setIdentity(null); setIdentityConfirmed(false); setGooglePlaceId(undefined);
      router.push(pipelineHref); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not create prospect"); }
    finally { setPending(false); }
  }

  return <form onSubmit={onSubmit} className="space-y-5">
    <ProspectBusinessSearch onSelect={selectBusiness} disabled={pending} />
    <fieldset disabled={pending} className="space-y-4">
      <legend className="mb-2 font-semibold text-white">Review and add prospect</legend>
      <p className="text-sm text-slate-400">Select a result above or enter details manually. Review the business identity before adding it to your pipeline.</p>
      <label className="block text-sm text-slate-400">Business name *
        <input name="businessName" required value={fields.businessName} onChange={(event) => { setFields({ ...fields, businessName: event.target.value }); setIdentityConfirmed(false); }} className={inputClass} />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 text-sm text-slate-400">Australian ABN (optional)
          <input name="abn" inputMode="numeric" value={fields.abn} onChange={(event) => { setFields({ ...fields, abn: event.target.value }); setIdentity(null); setIdentityConfirmed(false); }} placeholder="11-digit ABN" className={inputClass} />
        </label>
        <button type="button" disabled={pending || !fields.abn.trim()} onClick={() => void verifyAbn()} className="min-h-11 rounded-lg border border-violet-500 px-4 py-2 text-sm text-violet-200 disabled:opacity-50">Verify ABN</button>
      </div>
      {identity ? <div className="space-y-2 rounded-lg border border-emerald-700 p-4 text-sm">
        <p className="font-medium text-emerald-200">ABR identity retrieved</p>
        <p className="text-white">{identity.entity.legalName} · ABN {identity.identifiers.abn}</p>
        <p className="text-slate-300">{[identity.entity.status, identity.entity.typeDescription, identity.entity.address?.state, identity.entity.address?.postcode].filter(Boolean).join(" · ")}</p>
        {identity.entity.businessNames?.length ? <p className="text-slate-400">Business names: {identity.entity.businessNames.join(", ")}</p> : null}
        <label className="flex min-h-11 items-center gap-2 text-slate-200"><input type="checkbox" required checked={identityConfirmed} onChange={(event) => setIdentityConfirmed(event.target.checked)} />I confirm this ABN belongs to the business and any Google details selected above.</label>
      </div> : <p className="text-xs text-slate-400">No verified ABN selected. You can add an unverified prospect without an ABN, or verify one above. An ABN is never inferred from a Google listing.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {([
          ["industry", "Industry", "Real estate"], ["location", "Location", "Gold Coast, QLD"],
          ["contactName", "Contact name", ""], ["contactEmail", "Contact email", ""],
          ["contactPhone", "Phone", ""], ["websiteUrl", "Website", "https://"],
        ] as const).map(([key, label, placeholder]) => <label key={key} className="block text-sm text-slate-400">{label}
          <input name={key} type={key === "contactEmail" ? "email" : "text"} value={fields[key]} placeholder={placeholder} onChange={(event) => { setFields({ ...fields, [key]: event.target.value }); setIdentityConfirmed(false); }} className={inputClass} />
        </label>)}
      </div>
      {error ? <div role="alert" className="text-sm text-red-300"><p>{error}</p><a href="/apps/prospecting/pipeline?archived=1" className="underline">View deleted prospects to restore an existing identity</a></div> : null}
      <button type="submit" disabled={pending || Boolean(fields.abn && (!identity || !identityConfirmed))} className="min-h-11 rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50">{pending ? "Working…" : "Add to pipeline"}</button>
    </fieldset>
  </form>;
}

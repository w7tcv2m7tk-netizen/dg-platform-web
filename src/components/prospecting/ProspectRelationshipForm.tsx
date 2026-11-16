"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Choice = { id: string; label: string };
type Suggestion = Choice & { evidence: string; website?: string; email?: string; phone?: string };
export function ProspectRelationshipForm({ prospectId, abn, companies, contacts, organisations, companySuggestions = [], contactSuggestions = [], prospectWebsite, prospectContactEmail, prospectContactPhone }: {
  prospectId: string; abn: string | null; companies: Choice[]; contacts: Choice[]; organisations: Choice[]; companySuggestions?: Suggestion[]; contactSuggestions?: Suggestion[]; prospectWebsite?: string | null; prospectContactEmail?: string | null; prospectContactPhone?: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [customerOrganisationId, setCustomerOrganisationId] = useState("");
  async function adoptCompanyDetails(suggestion: Suggestion) {
    const changes: Record<string, string> = {};
    if (!prospectWebsite?.trim() && suggestion.website) changes.websiteUrl = suggestion.website;
    if (!prospectContactEmail?.trim() && suggestion.email) changes.contactEmail = suggestion.email;
    if (!prospectContactPhone?.trim() && suggestion.phone) changes.contactPhone = suggestion.phone;
    if (!Object.keys(changes).length) { setMessage("No missing website or contact details are available from this company."); return; }
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/prospecting/prospects/${prospectId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(changes) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not add company details");
      setMessage("Missing company details added after confirmation. Link the CRM relationship separately if it is still unlinked.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add company details"); }
    finally { setPending(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>, identity: boolean) {
    event.preventDefault(); setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries([...form.entries()].filter(([, value]) => value));
    try {
      const response = await fetch(`/api/v1/prospecting/prospects/${prospectId}/${identity ? "identity" : "relationships"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not save relationship");
      setMessage(identity ? "ABN verified through ABR." : "Existing relationship linked."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save"); }
    finally { setPending(false); }
  }
  return <section className="rounded-xl border border-slate-800 p-4 space-y-4">
    <h2 className="font-semibold text-white">Business identity and existing relationships</h2>
    <form onSubmit={(event) => void submit(event, true)} className="flex flex-wrap items-end gap-3">
      <label className="text-sm text-slate-300">Australian ABN<input name="abn" defaultValue={abn ?? ""} required inputMode="numeric" className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" /></label>
      <button disabled={pending} className="min-h-11 rounded-lg border border-violet-500 px-3 text-sm text-violet-200">Verify with ABR</button>
    </form>
    {(companySuggestions.length || contactSuggestions.length) ? <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-3">
      <p className="text-sm font-medium text-white">Possible CRM matches</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">These are suggestions from existing tenant CRM records. Applying a suggestion only fills the selector; nothing is linked until you confirm below.</p>
      <div className="mt-3 space-y-2">
        {companySuggestions.map((suggestion) => <div key={suggestion.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-2.5"><div><p className="text-sm text-slate-200">{suggestion.label}</p><p className="text-[11px] text-slate-500">{suggestion.evidence}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setCompanyId(suggestion.id)} className="text-xs font-medium text-violet-300 hover:text-violet-200">Select company</button>{suggestion.website || suggestion.email || suggestion.phone ? <button type="button" disabled={pending} onClick={() => void adoptCompanyDetails(suggestion)} className="text-xs font-medium text-violet-300 hover:text-violet-200 disabled:opacity-40">Use missing details</button> : null}</div></div>)}
        {contactSuggestions.map((suggestion) => <div key={suggestion.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-2.5"><div><p className="text-sm text-slate-200">{suggestion.label}</p><p className="text-[11px] text-slate-500">{suggestion.evidence}</p></div><button type="button" onClick={() => setContactId(suggestion.id)} className="text-xs font-medium text-violet-300 hover:text-violet-200">Use contact</button></div>)}
      </div>
    </div> : null}
    <form onSubmit={(event) => void submit(event, false)} className="grid gap-3 sm:grid-cols-2">
      {([{ key: "companyId", label: "Existing CRM company", choices: companies, value: companyId, set: setCompanyId }, { key: "contactId", label: "Existing contact", choices: contacts, value: contactId, set: setContactId }, { key: "customerOrganisationId", label: "Existing customer organisation", choices: organisations, value: customerOrganisationId, set: setCustomerOrganisationId }]).map(({ key, label, choices, value, set }) => <label key={key} className="text-sm text-slate-300">{label}<select name={key} value={value} onChange={(event) => set(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"><option value="">Choose a relationship</option>{choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label>)}
      <button disabled={pending} className="min-h-11 self-end rounded-lg border border-violet-500 px-3 text-sm text-violet-200">Link selected relationships</button>
    </form>
    {message ? <p role="status" className="text-sm text-slate-300">{message}</p> : null}
  </section>;
}

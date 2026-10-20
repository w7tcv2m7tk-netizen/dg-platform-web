"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Choice = { id: string; label: string };
export function ProspectRelationshipForm({ prospectId, abn, companies, contacts, organisations }: {
  prospectId: string; abn: string | null; companies: Choice[]; contacts: Choice[]; organisations: Choice[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
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
    <form onSubmit={(event) => void submit(event, false)} className="grid gap-3 sm:grid-cols-2">
      {([{ key: "companyId", label: "Existing CRM company", choices: companies }, { key: "contactId", label: "Existing contact", choices: contacts }, { key: "customerOrganisationId", label: "Existing customer organisation", choices: organisations }]).map(({ key, label, choices }) => <label key={key} className="text-sm text-slate-300">{label}<select name={key} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"><option value="">Choose a relationship</option>{choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label>)}
      <button disabled={pending} className="min-h-11 self-end rounded-lg border border-violet-500 px-3 text-sm text-violet-200">Link selected relationships</button>
    </form>
    {message ? <p role="status" className="text-sm text-slate-300">{message}</p> : null}
  </section>;
}

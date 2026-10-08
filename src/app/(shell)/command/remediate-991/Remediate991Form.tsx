'use client';

import { useActionState } from 'react';
import { runPhysical991Action } from './actions';

export function Remediate991Form() {
  const [result, action, pending] = useActionState(runPhysical991Action, null);

  if (result) {
    return (
      <section className="mt-6 max-w-xl rounded-xl border border-rose-400/30 bg-rose-950/20 p-5">
        {result === 'success' ? <p role="status" className="text-sm text-emerald-200">The transaction reported success. Independently verify the database state before shutdown. This form is now closed.</p> : null}
        {result === 'refused' ? <p role="status" className="text-sm text-amber-200">The operation was refused. This form is now closed; do not submit again without a fresh preflight.</p> : null}
        {result === 'ambiguous' ? <p role="alert" className="text-sm font-semibold text-rose-100">STOP. Completion is ambiguous. Do not submit again. Independently verify database state using the approved read-only procedure.</p> : null}
      </section>
    );
  }

  return (
    <form action={action} className="mt-6 max-w-xl space-y-4 rounded-xl border border-rose-400/30 bg-rose-950/20 p-5">
      <label className="block text-sm text-rose-50" htmlFor="physical-991-confirmation">
        Type <code>REMEDIATE_991_PHYSICAL</code> to confirm this one-time Production schema operation.
      </label>
      <input
        id="physical-991-confirmation"
        name="confirmation"
        type="text"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        required
        pattern="REMEDIATE_991_PHYSICAL"
        className="w-full rounded-lg border border-rose-300/30 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-rose-300/40 bg-rose-400/15 px-4 py-2 text-sm font-semibold text-rose-50 disabled:opacity-50"
      >
        {pending ? 'Submitting once…' : 'Confirm and run once'}
      </button>
    </form>
  );
}

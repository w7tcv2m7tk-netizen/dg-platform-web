'use client';

import { useActionState } from 'react';
import { runReconcile991Action } from './actions';

const CONFIRMATION = 'RECONCILE_991_MIGRATION_HISTORY';
type Result = 'success' | 'refused' | 'ambiguous';

export function Reconcile991Form() {
  const [result, action, pending] = useActionState<Result | null, FormData>(runReconcile991Action, null);

  if (result) {
    return (
      <section className="mt-6 max-w-xl rounded-xl border border-amber-400/30 bg-amber-950/20 p-5">
        {result === 'success' ? <p role="status" className="text-sm text-emerald-200">The transaction reported success. Stop and independently verify the migration history and protected tables before shutdown.</p> : null}
        {result === 'refused' ? <p role="status" className="text-sm text-amber-200">The operation was refused. Stop and review the read-only database state before any further action.</p> : null}
        {result === 'ambiguous' ? <p role="alert" className="text-sm font-semibold text-rose-100">STOP. Completion is ambiguous. Do not submit again. Independently verify database state using the approved read-only procedure.</p> : null}
      </section>
    );
  }

  return (
    <form action={action} className="mt-6 max-w-xl space-y-4 rounded-xl border border-amber-400/30 bg-amber-950/20 p-5">
      <label className="block text-sm text-amber-50" htmlFor="reconcile-991-confirmation">
        Type <code>{CONFIRMATION}</code> to confirm the one-time migration-history reconciliation.
      </label>
      <input
        id="reconcile-991-confirmation"
        name="confirmation"
        type="text"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        required
        pattern={CONFIRMATION}
        className="w-full rounded-lg border border-amber-300/30 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
      />
      <button type="submit" disabled={pending} className="rounded-lg border border-amber-300/40 bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-50 disabled:opacity-50">
        {pending ? 'Submitting once…' : 'Confirm and reconcile once'}
      </button>
    </form>
  );
}

import { getPlatformOperatorContext } from '@/lib/platform-operator';
import { reconciliation991ActionEnabled } from '@/lib/reconcile-991';
import { Reconcile991Form } from './Reconcile991Form';

export const dynamic = 'force-dynamic';

export default async function Reconcile991Page() {
  const operator = await getPlatformOperatorContext();
  if (!operator) {
    return <main className="dg-page-main"><h1 className="text-xl font-bold text-white">Platform operator access required</h1></main>;
  }

  return (
    <main className="dg-page-main mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-white">One-time #991 migration-history reconciliation</h1>
      <p className="mt-3 text-sm text-slate-300">This action uses the existing #993 transaction and catalog safeguards. Clerk platform-operator access is checked again at submission and inside the transaction. No reconciliation secret or database credential is sent to this browser.</p>
      <p className="mt-3 text-sm text-rose-100">Proceed only after the approved deployment, recovery snapshot, exact database starting state, migration checks, and disabled worker state have been independently verified.</p>
      {reconciliation991ActionEnabled() ? <Reconcile991Form /> : <p className="mt-6 rounded-lg border border-amber-300/20 bg-amber-950/20 p-4 text-sm text-amber-100">The temporary Production operation flag is absent or the Production safety gate is not satisfied. Execution is disabled.</p>}
    </main>
  );
}

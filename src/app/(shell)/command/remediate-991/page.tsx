import { getPlatformOperatorContext } from '@/lib/platform-operator';
import { physical991ActionEnabled } from '@/lib/remediate-991-physical';
import { Remediate991Form } from './Remediate991Form';

export const dynamic = 'force-dynamic';

export default async function Remediate991Page() {
  const operator = await getPlatformOperatorContext();
  if (!operator) {
    return <main className="dg-page-main"><h1 className="text-xl font-bold text-white">Platform operator access required</h1></main>;
  }

  return (
    <main className="dg-page-main mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-white">One-time #991 physical remediation</h1>
      <p className="mt-3 text-sm text-slate-300">This action uses the pinned six-delta transaction and requires current platform-operator authority. No database credential or remediation secret is sent to this browser.</p>
      <p className="mt-3 text-sm text-rose-100">Only proceed after the approved snapshot, exact starting state, worker-disabled state, and deployment preflight have been independently verified.</p>
      {physical991ActionEnabled() ? <Remediate991Form /> : <p className="mt-6 rounded-lg border border-amber-300/20 bg-amber-950/20 p-4 text-sm text-amber-100">The temporary Production operation flag is absent or the Production safety gate is not satisfied. Execution is disabled.</p>}
    </main>
  );
}

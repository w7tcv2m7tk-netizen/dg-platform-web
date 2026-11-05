import { createHash, randomUUID } from 'node:crypto';
import { isApiKeyPrincipal } from '../../packages/platform-core/src/access/platform-authority';
import { identityEnvelope, identityRefusal } from './runtime-identity-request';
import type { IdentityResult } from './runtime-identity';

export type RuntimeBinding = {
  project: string; deployment: string; revision: string; environment: 'production';
};
export type IdentityGrant = RuntimeBinding & {
  grantId: string; actor: string; expectedRole: string; expectedDatabase: string;
  endpoint: string; neonProject: string; neonBranch: string; providerVerifiedAt: Date;
};
export type IdentityOutcome = 'verified' | 'denied' | 'unavailable';
export type IdentityControlStore = {
  claim: (digest: string, actor: string, binding: RuntimeBinding, requestId: string) => Promise<IdentityGrant | null>;
  finish: (grant: IdentityGrant, requestId: string, outcome: IdentityOutcome) => Promise<void>;
};
type Dependencies = {
  authenticate: () => Promise<string | null>;
  binding: () => RuntimeBinding | null;
  store: () => IdentityControlStore;
  probe: (grant: IdentityGrant) => Promise<IdentityResult>;
};
const projectId = 'prj_RzOMts2AdqpKtbAgZ72GLKs55AJ2';
export function validBinding(value: RuntimeBinding | null): value is RuntimeBinding {
  return !!value && value.project === projectId && /^dpl_[A-Za-z0-9]{20,64}$/.test(value.deployment) &&
    /^[a-f0-9]{40}$/.test(value.revision) && value.environment === 'production';
}

/** A slot contains surviving work; durable consumption, NOT this slot, prevents replay. */
export function createIdentityInvocation(responseMs = 6500) {
  let occupied = false;
  return async (request: Request, deps: Dependencies): Promise<Response> => {
    if (!await identityEnvelope(request)) return identityRefusal();
    const token = request.headers.get('X-DG-Identity-Token');
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token) || occupied) return identityRefusal();
    occupied = true;
    const deadline = performance.now() + responseMs;
    let timedOut = false;
    const expired = () => timedOut || performance.now() >= deadline || request.signal.aborted;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const work = (async (): Promise<Response> => {
      let grant: IdentityGrant | null = null;
      let control: IdentityControlStore | undefined;
      let finishAttempted = false;
      const requestId = randomUUID();
      try {
        const actor = await deps.authenticate();
        if (expired() || !actor || isApiKeyPrincipal(actor)) return identityRefusal();
        const binding = deps.binding();
        if (!validBinding(binding)) return identityRefusal();
        control = deps.store();
        grant = await control.claim(createHash('sha256').update(token).digest('hex'), actor, binding, requestId);
        if (!grant) return identityRefusal();
        if (grant.actor !== actor || grant.project !== binding.project || grant.deployment !== binding.deployment ||
            grant.revision !== binding.revision || grant.environment !== binding.environment) throw new Error('claim binding mismatch');
        // No target client import/SQL until the durable claim+audit COMMIT is known.
        let result: IdentityResult = { status: 'unavailable' };
        if (!expired()) result = await deps.probe(grant);
        const outcome = !expired() && result.status === 'ok' ? 'verified'
          : result.status === 'denied' ? 'denied' : 'unavailable';
        finishAttempted = true;
        await control.finish(grant, requestId, outcome);
        if (expired() || outcome !== 'verified') return identityRefusal();
        return Response.json({ ...result, requestId, deployment: binding.deployment,
          branchCorrelation: 'provider-attested-configuration',
          permissions: 'limited-session-checks' }, { headers: {
          'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        } });
      } catch {
        // An uncertain claim is never retried. A claimed-but-unfinished audit is an
        // explicit ambiguous outcome, never a permit to probe again.
        if (grant && control && !finishAttempted) {
          try { await control.finish(grant, requestId, 'unavailable'); } catch { /* retain claimed evidence */ }
        }
        return identityRefusal();
      }
    })().finally(() => { occupied = false; });
    try {
      const response = await Promise.race([work, new Promise<Response>(resolve => {
        timer = setTimeout(() => { timedOut = true; resolve(identityRefusal()); }, responseMs);
      })]);
      return expired() ? identityRefusal() : response;
    } finally { clearTimeout(timer); }
  };
}

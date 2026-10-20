# Slice 5 PR 2 — internal routing decision evidence

This implements the bounded observational increment within the existing Slice 5
[roadmap](../ROADMAP.md#ai-gateway-slice-roadmap). The existing Gateway, policy
intersection and local approval checks remain the execution authorities.

`routing-trace.ts` defines the allowlisted internal event contract.
`routing-evidence.ts` provides the pure version 1 formatter. Neither is exported
through a public barrel. Runtime code imports only the trace contract/helper;
it never imports or validates the Model Capability Registry. The formatter
references registry version 1 and marks certification current or unavailable
at an explicit time. Expiry cannot disable inference.

The optional second argument to `resolveAiRouting` / `describeAiDeployments`, and
optional `routingObserver` Gateway dependency, allow an internal caller to retain
metadata in memory. Default callers collect nothing. No request/response shape,
ledger persistence, API endpoint, worker or UI is added. No provider calls are
made by the trace or formatter.

Events follow existing decision points:

- `task`: registered task and task contract version.
- `disclosure`: effective classification, intersected recipients and disclosure
  constraints, after tenant/envelope checks and policy intersection.
- `constraints`: validated execution fields and effective requirements.
  `output_budget` records the output token limit after its existing validation.
- `certification`: configured transport slot and the existing policy capability
  certification result. Its index addresses the pre-certification input chain.
- `candidate`: policy-certified deployment slot, after recipient/capability/lane
  filtering. Its index addresses the router's deployment input, rather than the
  pre-certification chain. Reasons distinguish exclusion, primary/fallback
  eligibility and eligibility beyond the attempt cap. Repeated slots retain order.
- `outcome`: routing approval/rejection, not an inference success claim. Original
  thrown error classes and codes remain unchanged. In particular, an empty
  policy-certified available deployment list is technical unavailability while a nonempty list with no
  permitted recipient is policy rejection; both still throw `policy_denied`.
  `local_required_lane_mismatch` and `local_fallback_forbidden` describe policy
  constraints even though the original error is `local_transport_unavailable`.
- `local_approval`: existing database approval's policy version; excludes its
  tenant, approval and deployment identifiers. Approval lookup failure is
  technical unavailability; no matching approval is policy rejection.
- `selection`: successful, validated cloud result's index in the final plan.
  Planned primary/fallback eligibility does not claim a provider was invoked.

Early rejection stops evidence at the same boundary as routing. No hypothetical
candidate checks run after a terminal rejection. Local routing does not evaluate
cloud eligibility; its plan approval and local policy version are recorded without
copying worker/deployment identity. Local database approval remains rechecked by
existing enqueue/disclosure logic. The formatter refuses traces without a
validated task, effective disclosure and terminal routing outcome, so early tenant/unsupported-classification
and local-lookup failures remain partial raw observations rather than invented
complete decisions. Mixed traces and approved plans missing validated constraints
are also rejected. Evidence is neither a replay mechanism nor authorisation.

Only the three existing policy-certified model names may appear. Unknown model
names become `null`, preserving the candidate index and exclusion reason without
copying arbitrary configuration strings. Prompts, outputs, evidence records,
personal information, tenant/actor/correlation identifiers, credentials and
exception messages never enter the contract. Recipient and event snapshots are
strictly validated, copied and frozen; arbitrary fields and accessors fail closed.

Construction and observer exceptions are swallowed without logging or changing
routing. Promise-returning observers are not awaited and their rejections are
contained. The formatter can fail closed while the Gateway continues inference.
Observers are trusted internal metadata sinks and should do bounded work; no
production observer is enabled by this increment. There is no durable audit trail,
provider-health probing, provider error explanation, optimisation or new approval.

Synthetic coverage lives in `scripts/test-ai-routing-evidence.mjs` and the Gateway
regressions. Run `npm run test:ai-routing-evidence`, the existing Gateway/policy/
registry tests, TypeScript, targeted ESLint and the normal build pipeline.

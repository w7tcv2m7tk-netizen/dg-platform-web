# DigitalGate — Execution Roadmap

**Version:** 2.2 — Foundations before implementation
**Last updated:** 20 October 2026 (dated history retained)

> **Historical foundation context (August 2026):** The following direction is retained as implementation history. Current approved delivery order, commercial catalogue and verification authority are recorded below; historical Founding targets do not reactivate that programme.
>
> **Feature filter:** Does this strengthen **Platform Core** or the **Real Estate App**? If no, defer.
>
> **Market filter:** Ship for **Australia first**; keep schemas and Apps **Country Pack–ready** so NZ/UK/US don’t require a rebuild ([GLOBAL-READINESS.md](./foundations/GLOBAL-READINESS.md)).

> **Implementation gate:** Complete [foundations/CORE-OBJECT-SPECIFICATION.md](./foundations/CORE-OBJECT-SPECIFICATION.md) review and lock Platform 1.0 scope before expanding code. See [foundations/README.md](./foundations/README.md).

> **Architecture north-star:** [architecture/GEN-2-ARCHITECTURE-BRIEF.md](./architecture/GEN-2-ARCHITECTURE-BRIEF.md) — Immediate Priority 1–15 are architectural foundations; do **not** boil the ocean on all 36 brief items ([ADR 0012](./adr/0012-gen-2-architecture-brief-adopted.md)).
>
> **GTM / rollout:** [strategy/DIGITALGATE-ROLLOUT.md](./strategy/DIGITALGATE-ROLLOUT.md) — Business Operating Platform; AU RE wedge → Founding Customers → Prospecting Engine ([ADR 0013](./adr/0013-gtm-rollout-strategy-adopted.md)). Engineering follows this roadmap; marketing follows that brief.
>
> **Commercialisation target:** [foundations/COMMERCIALLY-READY-V1.md](./foundations/COMMERCIALLY-READY-V1.md) — **Commercially Ready v1**; next milestone **5 founding agencies** (pre-launch / founding marketing mode); Gates 1–4; 🔴 Commercial Core → 🟠 First Customer Value → 🟢 After Validation. Not “finish Gen 2.”
>
> **Intelligent layer:** [foundations/INTELLIGENT-LAYER.md](./foundations/INTELLIGENT-LAYER.md) — Connect → Centralise → Understand → **Decide** → Act → **Learn** → Grow; moat **Twin → Intelligence → Action → Learning**. Advisor-confirmed Aug 2026. Long-term moat — does **not** expand founding ship list. Next phase: **make DigitalGate feel intelligent**. Danger now is **feature sprawl**, not missing features.

---

## Current development register and governance — 20 October 2026

This existing Roadmap is the authoritative development register. `/command/product/roadmap` displays the existing requirement catalogue through its reconciliation layer; it is not a separate backlog. Keep catalogue IDs, approved scope, this verification record and implementation references aligned. The four historical UI progress values (`done`, `in_progress`, `scaffold`, `planned`) describe build progress, not approval or production certification. The six states below record verification and delivery authority. A `planned` item is not automatically approved.

| Verification state | Evidence required |
| --- | --- |
| **COMPLETE AND VERIFIED** | Approved acceptance criteria satisfied in the stated environment, with implementation and test/verification evidence; no remaining work within that scope. Local verification must never be presented as production verification. |
| **IMPLEMENTED BUT UNVERIFIED** | Implementation exists; required operational/acceptance evidence is absent. Code, passing tests, merged PRs and published agents alone are insufficient. |
| **IN PROGRESS** | Work on an approved requirement is underway; record precisely what is delivered and remains. |
| **APPROVED AND NOT STARTED** | Explicit requirement-level approval exists, with no implementation started. Include the approval reference. |
| **BLOCKED** | A named dependency prevents the next approved step. Record the dependency, resolution and owner/operator action. |
| **AWAITING APPROVAL** | Proposed scope or consequential operation has no recorded approval. It must not enter the approved implementation backlog. |

Each task references an existing requirement ID. Before closure, record implementation files/branch/commit and issue/PR, test commands/counts/failures/skips with date and revision, verification environment/status, remaining work, blockers and the exact next action. Keep dated evidence rather than overwriting history with a more optimistic label. Invalidate affected verification when implementation, schema, provider configuration or dependencies change. Reconcile the affected entry in the same development change; a task cannot be closed without this record.

**System boundaries:** Business Brain stores explicitly approved business knowledge, rules and strategic context. Platform Docs store supported architecture and verified technical behaviour, identifying proposed/undeployed behaviour. The Roadmap owns development tasks. Do not duplicate tasks or auto-promote Brain knowledge to approved. New ideas require operator approval before entering the approved development backlog. Architecture direction does not authorise every implementation phase or production activation.

**Approved delivery order:** **P0 commercial launch → P1 prospecting → P1 Aida/Business Brain → P1 Daily Business Briefings → P1 AI Voice.** CRM/automation, platform experience, Industry Apps and integrations retain their existing requirements and support these workstreams; no new expansion is authorised here.

### Requirement reconciliation

Historical audit baseline (11–12 October, retained as dated evidence): local checkout candidate `2d04d58f75dc12ed50015176939e31bc5af31767`; remote main and production `6793e37283b8597d26679442e5adae3c9393e3f6`, independently checked 11 October. Subsequent uncommitted governance/test changes must be identified as local changes, not a new PR head. GitHub had no open issues; recent closed issue-page inspection contained no standalone issues. Existing PRs, requirement IDs and operator instructions provide the available scope/history evidence; no issue approvals are invented.

| Priority / existing requirement | Approved boundary and implementation evidence | Current verification state / remaining work | Next action and approval |
| --- | --- | --- | --- |
| **P0 Commercial launch — `platform.auth`, `detach.portal_billing`** | #1008 compatibility is merged; #1016 is the independent webhook guard, #1006 the checkout coordinator, and #1015 the later entitlement/Finance cutover. | **BLOCKED** for operational certification. Local test evidence does not establish hosted customer success. | Follow the dependency order and [customer certification review](commerce/CUSTOMER-CHECKOUT-CERTIFICATION.md). Keep live billing inactive until the recorded migration, topology, reconciliation and hosted test gates are satisfied. |
| **P1 Prospecting — `growth.discovery`, `growth.audit`, `growth.reports`, `growth.pipeline`, `growth.transition`** | Existing discovery/research/report/CRM lifecycle retained. #1017 navigation is deployed. #1018 stages verified identity, search/review intake, priorities and restorable deletion. | **IMPLEMENTED BUT UNVERIFIED** for Phase 1 authenticated workflows. The snapshot/revocation migration was restored on 20 October; the owner confirmed Activity recovery. | Complete authenticated local verification and the separate identity migration release gate. No automatic Neon previews, fabricated evidence or live duplicate cleanup. |
| **P1 Aida — `future.intelligence.aida`** | Existing shell chat, Advisor, Brain/Twin context, human-controlled actions and shared AI service. AI Gateway #984/#985/#987, model registry #1003 and routing evidence #1007 are merged; #1005 diagnostics is also merged. | **IMPLEMENTED BUT UNVERIFIED** end-to-end. Advisor still uses legacy `llmChat`; code deployment is not proof of approved recipient/worker/task activation. [#1010](https://github.com/w7tcv2m7tk-netizen/dg-platform-web/pull/1010) documentation is merged; proposed future stages are not runtime implementation approval. | Verify existing context/actions and gateway authority first. New conversation tasks, recipients, autonomy and provider activation need scoped approval. Architecture direction is not completion of Slice 5. |
| **Business Brain — `future.intelligence.memory`, `future.intelligence.graph`** | Existing organisation-scoped source/item/link repository and approval/supersession lifecycle; [knowledge architecture](foundations/BUSINESS-BRAIN-KNOWLEDGE.md). No replacement memory or task register. | **IMPLEMENTED BUT UNVERIFIED** current approved knowledge coverage: 27 sources, 67 items all `proposed`, zero approval timestamps, zero links in the audited database. Approved-only Aida retrieval therefore has no approved durable knowledge. | Owner reviews existing items, approves only supported knowledge and records supersession explicitly. This governance task does not approve or write business facts. Broader graph/evidence contracts remain awaiting their scoped decisions. |
| **P1 Daily Business Briefings — `core.industry_intelligence`; distinguish `growth.daily_briefing`** | Existing prospecting morning greeting/counters are `growth.daily_briefing`, not a customer industry briefing. [#1009](https://github.com/w7tcv2m7tk-netizen/dg-platform-web/pull/1009), branch `feat/aida-business-briefing-phase1`, merged in #1009 at `385b1c3b`, adds a default-OFF presentation/retrieval seam; ten briefing tests and the complete prebuild/build passed. | Foundation merged and verified locally; **AWAITING APPROVAL** for evidence sources, runtime publication contracts, persistence/scheduling and recipient/budget decisions. Repository returns null; no current complete generated business briefing. #1010 P0–P6 remains proposed scope after its documentation merge. | Keep the merged foundation OFF; resolve existing evidence-generation approval decisions and reuse Brain/Twin/gateway. Do not implement its broader proposed pipeline or a new feed service without approval. |
| **P1 AI Voice — `comms.voice`, `comms.agents`, `comms.call_centre`, `comms.knowledge`** | Continue ElevenLabs as replaceable provider, DigitalGate CRM/tools as authority, authorised context and post-call qualification. [voice architecture](ai/VOICE-AGENT-ARCHITECTURE.md), [runbook](ai/VOICE-AGENT-RUNBOOK.md). | **IMPLEMENTED BUT UNVERIFIED** operationally: three published agents with provider IDs and three completed sessions do not prove current phone/tool/webhook continuity. Context is presently a Business Profile subset; deeper Brain, real transfer and Aida microphone features are not certified complete. | Rehearse existing tools/webhooks/qualification with isolated data; validate provider/consent/permission boundaries. Live calls, publishing/provider changes and new speech architecture require approval. |
| **CRM and automation — `crm.contacts`, `crm.companies`, `crm.timeline`, `automation.engine`, `automation.ui`, `automation.rules`, `automation.logs`** | Canonical tenant-owned CRM objects and existing rules/logs. Engine/default rules exist; visual builder remains scaffold. Preserve human approval and truthful delivery states. | **IMPLEMENTED BUT UNVERIFIED** cross-system delivery/outcomes; **IN PROGRESS** visual builder. Existing planned/custom-rule requirements are preserved; none is reclassified as approved solely from catalogue status. | Verify permissioned conversion, action outcomes, retries and sent-vs-queued semantics in the existing implementation. New custom-rule/autonomy scope needs explicit approval evidence. |
| **Platform experience — `platform.auth`, `platform.roadmap`, `future.platform.mobile`** | Native authenticated organisation context, Aida-led Overview and mobile/onboarding surfaces. Roadmap UI/reconciliation exists. | **IMPLEMENTED BUT UNVERIFIED** complete live customer journey. Historical “not deployed” scaffold statements below are superseded by the deployed native runtime; the 2026-08 history is retained. | Close P0 signup/onboarding evidence and reconcile only supported statuses; do not expand navigation or introduce new customer features. |
| **Industry applications — existing `re.*`, `services.*`, `finance.*`, accommodation and industry catalogue IDs** | Preserve approved platform/industry boundaries, universal CRM objects, app entitlements and existing beta scopes. Existing manifests/routes/beta tests do not prove every vertical commercially complete. | **IN PROGRESS** at existing scoped beta boundaries; operational acceptance for each complete vertical is **IMPLEMENTED BUT UNVERIFIED** or **AWAITING APPROVAL** for explicitly future expansion. Do not silently retire approved requirements or flatten all verticals to done. | Validate only the Industry App selected for the launch journey; retain the existing beta launch/pilot packs. Broad vertical expansion is not a first-payment dependency. |
| **Integrations — `platform.connector_engine`, `platform.connector_google`, `platform.connector_meta`, `platform.connector_comms`, `platform.connector_asic` and existing specialist IDs** | Existing connector authority, credential isolation and provider adapters. Google surfaces are implemented; ASIC provider approval and specialist commercial access remain explicit dependencies. | **IMPLEMENTED BUT UNVERIFIED** actual tenant/provider permissions and continuity; **BLOCKED** where provider approval is absent. A connector page does not establish live connectivity. | Verify only launch-required providers; preserve Scale/Enterprise specialist entitlement checks. New providers, procurement and configuration changes require approval. |

No new requirement is labelled **APPROVED AND NOT STARTED** without approval evidence. Previously approved requirements remain intact; unresolved approval is recorded rather than inferred from a future capability catalogue. Historical retired Founding entries remain in source/history; the existing display filter is not permission to delete or redefine them.

### Backlog reconciliation — 20 October 2026

Requirements: `platform.roadmap`, `platform.auth`, `detach.portal_billing`,
`future.intelligence.aida`, `core.industry_intelligence`, and existing `growth.*` IDs.
PR #1011 is being detached from the unmerged checkout base without importing its
billing changes. The coordinator-dependent tier test remains work for #1006;
it must not be installed in a governance-only release on compatibility main.
PR #1009 remains OFF by default and contains no live briefing provider activation.
Issues #1013/#1014 must close only on their actual acceptance evidence, not to clear
an open-items counter. The reminder's customer-by-customer result is recorded in
[checkout certification](commerce/CUSTOMER-CHECKOUT-CERTIFICATION.md).

No automatic Vercel previews or Neon preview databases are permitted. Local full
builds must include prebuild checks. Preview build success is dated build evidence,
not authenticated certification. No live payment, entitlement reconciliation, new
Production migration or checkout reopening is authorised by this reconciliation.

### Commercial catalogue and WordPress closure

Starter **AUD $99/month**, Growth **$249/month**, Scale **$499/month** are current Core products, each with a 14-day trial. Internal IDs remain `starter`, `professional`, `business`; older internal IDs do not make the products obsolete. Current code/docs also specify Growth Suite $399, Suite + Industry $499, Industry $149 with additional templates $29, Priority $199 and Success Partner $499. Six ACTIVE/FULL records are exempt platform records, not paying Stripe subscriptions. Never deactivate current products/Payment Links based on implementation age.

Targeted WordPress isolation: **COMPLETE AND VERIFIED locally**, with **40/40** PHP regression tests against the actual corrected local source, rechecked 11 October. Initial 26/28 failures comprised one harness error (`register_rest_routes` versus actual `register_routes`) and 25 failing safety assertions; corrected original harness baseline was 3/28 passing, not 25 separate defects. Changed files are local `dg-platform/includes/class-stripe-billing.php` and `dg-platform/scripts/test-stripe-billing-isolation.php`, outside this platform repository. SHA256 of tested billing source: `24f372da3cfb6eb9629ef327895031038311bc7bbe73db8ca2d071b64d592707`; regression source: `abd62d213c24eecba233e8216c975d449e40d510b07a17872f4fc5fe2a9d1c0e`.

The tests execute PHP 8.4 with mocked WordPress/provider services and disposable SQLite. Actual WordPress deployment/origin, full MySQL/cache/concurrency and live accommodation payments remain **unverified**. No production customer records were altered. Stop WordPress development unless a verified commercial-launch blocker requires it; do not make redevelopment a prerequisite.

### P0 verification record — local changes based on PR #1006 `2d04d58f`

Real hosted E2E status: **BLOCKED / NOT VERIFIED**. On 11 October, the available Stripe connector exposed only DigitalGate `livemode=true`; this worktree/process had no Stripe or Clerk test credentials. No live request or provider transaction was attempted. The requested sandbox/Clerk test connection remains the exact dependency for browser signup, hosted Checkout, real test-mode webhook delivery and access verification. Mocked Stripe tests must not be relabelled hosted Stripe test-mode E2E.

Local validation, 12 October 2026, uncommitted changes on `2d04d58f`: coordinator PostgreSQL **44/44**; lifecycle PostgreSQL **95/95**, including three new current-tier creator/provisioning cases; focused checkout **83/83**; security **80/80**; signup/onboarding source-contract journey **15/15**; Roadmap governance **8/8**. Pricing/entitlements, onboarding checkout verification and prospecting mobile source checks passed. TypeScript and changed-file ESLint passed. Both disposable PostgreSQL clusters were stopped and destroyed. No hosted browser/Clerk signup, real Stripe Checkout, external test webhook delivery, production build or production verification was run in this task.

The added tier cases exercise production checkout creation and provisioning with real PostgreSQL and mocked Stripe: AUD 9900/24900/49900 cents, 14-day trials, no activation from checkout creation, closed-gate admission, canonical customer/subscription ownership and duplicate completion. An initial run passed the 92 existing cases and failed the three added cases because their assertion expected gate denial rather than the correct completed-attempt awaiting-webhook denial; corrected assertions preserve that lifecycle distinction. All 95 subsequently passed. Existing suite coverage includes payment failure/recovery, cancellation, replacement, tenant/account boundaries, webhook ordering and retry/timeouts. These tests do not establish actual external Price/Product mapping or the full hosted onboarding/access journey. Provider prices configured by external `STRIPE_PRICE_*` IDs remain unverified until their actual test-mode Price/Product records can be inspected. Local inline `price_data` mappings can be tested independently; they do not certify deployed Stripe Price IDs.

### Independent governance review and existing test services — 12 October 2026

Review of all eight files: all ten existing workstreams and catalogue requirements remain; no new products, pricing, features or implementation approval are introduced. Repository guidance requires requirement-linked evidence before closure. Historical foundation direction is retained and explicitly labelled; current commercial authority takes precedence. Fresh checks passed: Roadmap 8/8, lifecycle PostgreSQL 95/95, focused checkout 83/83, security 80/80, prospecting source assertions, TypeScript and changed-file lint. Lifecycle cluster was destroyed after testing. PR #1006 and remote main remain at the baseline SHAs above; #1006's two reported Vercel checks are SUCCESS. Governance is a separate review branch based on #1006, not another checkout candidate.

**Correction to the earlier access limitation:** existing `/Users/okcomputers/Documents/dg-platform-web/.env.local` contains usable test credentials. Read-only Stripe account/balance checks identify **DigitalGate sandbox**, `acct_1Tkx8TDvJFLKTIXN`, with `livemode=false`. Clerk's existing development instance is `equal-seahorse-9.clerk.accounts.dev`; its test key passed read-only API checks. An initial Clerk 403 was resolved by an explicit User-Agent, not by replacing credentials. No secret values are recorded or copied to Git. Reuse these services; the live-only connector inventory does not establish that no sandbox exists.

**Hosted readiness remains BLOCKED:** sandbox endpoint inventory is empty; no Stripe webhook is routed to the checkout preview. Its `STRIPE_WEBHOOK_SECRET` therefore cannot yet be certified against a hosted sandbox endpoint. The local Clerk configuration lacks `CLERK_WEBHOOK_SIGNING_SECRET`. No current-tier sandbox Price candidates or local `STRIPE_PRICE_*` overrides exist; production code supports inline AUD price data, so absent Price IDs alone are not a blocker. Test configured IDs separately if selected. Vercel metadata shows `STRIPE_SECRET_KEY` scoped only to Production; the Clerk key pair, webhook secrets and application URL have shared Preview/Production entries whose modes/routing were not decrypted or certified. Do not reuse those shared entries blindly.

Existing Neon branch `preview/work/commercial-readiness` (`br-mute-wildflower-a7w25ote`) is ready and has branch-specific Preview database variables. It was initialized from production data, so it is not certified disposable/anonymised; do not mutate its existing records. The local file points at the allowlisted development endpoint, not production, but its data isolation is also unverified. Existing infrastructure can be reused only after synthetic-fixture isolation and schema/gate checks; no new Neon infrastructure or migration is authorized by this review.

**Minimum operator handoff:** select the existing sandbox and Clerk development instance; securely supply their existing keys to the test runner/branch-scoped Preview (not chat or Git). Provide the sandbox Stripe endpoint signing secret for `/api/webhooks/stripe` and the development Clerk signing secret for `/api/webhooks/clerk`; enable the already-documented event coverage only in the test services. Match callback/application URLs to the approved test origin. Confirm a synthetic-data database context with the two checkout migrations installed and gate initially closed. The owner has disabled automatic Vercel previews and removed Neon preview branches. Use an explicitly configured local synthetic context; do not rebuild or provision Neon previews. Use inline current-tier prices or validate explicitly selected sandbox Price IDs, then admit creation only in the isolated test gate and return it closed after rehearsal. Live checkout stays closed.

Exact next action: operator supplies the missing test webhook routing/secrets and confirms the isolated data context/test origin; then run the already-approved Starter/Growth/Scale hosted journeys with disposable users and tenants, including signed delivery, duplicates, failures/cancellation and onboarding/access. Existing API keys need not be recreated. Production migrations/deployment/webhook settings/legacy containment and controlled opening remain separately approved operations. Prospecting, Aida, Daily Business Briefings and AI Voice remain next in that order.


---

## AI Gateway slice roadmap

**Approved direction: 7 October 2026.** This extends the canonical AI and Business Brain architecture; it does not expand the founding ship list or authorise implementing the whole future roadmap.

| Slice | Scope and boundary |
|-------|--------------------|
| **1 — AI Gateway foundation** | Preserve the completed shared Gateway foundation and existing AI Assist contracts. |
| **2 — Task routing & disclosure policy** | Preserve versioned task/execution/disclosure policies, tenant/actor context, exact-observation constraints and fail-closed recipient restrictions. |
| **3 — Local Routine Execution** | Code merged through PR #987 and production code deployment verified; operational activation remains gated. Only asynchronous `local_routine` for `lead_summary` / `lead_follow_up`, with the locked `dg-fast:latest` model/digest/profile and fenced encrypted jobs. No specialist execution or autonomous tools. |
| **4 — Local Specialist Execution** | Future controlled `dg-coder` / `local_specialist`, model transition management, specialist workloads and appropriate escalation within execution/disclosure policy. Not enabled by Slice 3 or this documentation approval. |
| **5 — AI Governance, Autonomous Operations & Observability** | Future staged delivery of the Action Ledger, Aida Autonomy Ladder, evidence/provenance, persistent responsibilities, approval boundaries, execution verification, model/data disclosure provenance, incident readiness, business-impact measurement, operational observability and model routing/cost/latency optimisation. |

Slice 3 production migration, encryption key, worker credentials, deployment and recipient approvals, and Mac worker/launchd installation remain separate operational gates. This roadmap does not apply or provision any of them. Slice 1–3 behaviour and AI Visibility exact-observation execution remain unchanged. See [AI Architecture](./ai/AI-ARCHITECTURE.md) and the existing [Slice 3 runbook](./ai/AI-GATEWAY-SLICE-3-RUNBOOK.md).

When Slice 5 approaches, produce and approve a staged implementation plan with bounded capabilities, dependencies, acceptance tests and rollout gates. A proposed sequencing basis is: (1) structured provenance, ledger coverage and verification contracts; (2) capability-specific autonomy/approval boundaries and one bounded persistent responsibility; (3) incident reconstruction and defensible value measurement; (4) evidence-based operational/routing/cost/latency improvements. Content governance and broader reputation capabilities need separately scoped increments. This is planning direction, not permission to implement every item together. Routing optimisation must never override disclosure, tenant isolation, specialist contracts or exact observations.

### Intelligent Model Routing & Optimisation — Slice 5 workstream (approved 9 October 2026)

**Decision:** Add a bounded **Model Intelligence & Routing** workstream within the existing AI Gateway Slice 5; do not create a second orchestration service or displace Slice 4. The existing `packages/platform-core/src/ai/` Gateway, `llm.ts` router, task/disclosure policies, usage ledger and Business Brain context remain authoritative. This is roadmap approval, **not** approval for production activation, model substitution, database migration or autonomous tool execution.

**Sequence and gates:**

1. **Now — read-only architecture and gap audit.** Inventory existing providers, routing/failover, task/model contracts, tenant/disclosure controls, local worker boundaries, usage/cost records and test coverage. Produce a gap analysis with evidence and a bounded implementation proposal. No runtime or production changes.
2. **Design — provider/model capability registry.** Specify versioned provider/model identity, execution lane, supported task and output contracts, locality/disclosure eligibility, context and latency budgets, cost metadata, health and evaluation provenance. Treat provider prices and model aliases as changeable, verified data, not hard-coded truth.
3. **Slice 5 staged implementation — governed task routing.** Evaluate eligible models only **after** tenant, actor, classification, recipient, model, exact-observation and specialist policy constraints. Add bounded fallback and explicit failure when no approved recipient/model qualifies. Preserve the existing confidential CRM direct-OpenAI approval and the exact-observation no-substitution contract unless separately authorised through their policy change process.
4. **Evidence before optimisation.** Compare task success/quality, validation, latency, availability, reported usage and estimated cost against approved test sets; account for missing usage and failed attempts without treating unknown as zero. Add per-tenant visibility only within existing authorisation boundaries. No automatic learning or model switching from unverified benchmark claims.
5. **Activation gate.** Require separate review of threat model, tenant isolation, disclosure policy, cost ceilings, fallback behaviour, auditability, regressions, rollback and staged rollout before any production change.

**Dependencies and priorities:** Founding-customer readiness, reliable Brain/CRM workflows, onboarding and recurring revenue remain higher priority. Slice 3 worker provisioning and physical remediation stay disabled under the verified PR #1001 production baseline until separately authorised. Slice 4 remains Local Specialist Execution. The weekly AI model intelligence review may recommend changes, but cannot independently amend approved knowledge, roadmap or runtime policy.

**Acceptance criteria for the audit:** a code-referenced inventory; implemented/partial/missing matrix; risk and cost assessment; proposed small PR sequence; explicit no-change list for Slice 1–3, tenant security and AI Visibility; and a decision gate before implementation.

---

### Persistent Aida Responsibilities (future)

Businesses should eventually be able to assign ongoing governed responsibilities: monitor overdue leads, advertising performance, reputation, website conversion health, vendor/listing campaigns and operational exceptions. Each responsibility needs an accountable owner, tenant/data/tool scope, trigger/cadence, evidence/freshness expectations, maximum autonomy level, approval boundary and measurable outcome, plus pause/revoke controls.

Responsibilities generate observations, recommendations and authorised actions through the same [governance framework](./foundations/AI-GOVERNANCE.md), rechecking current permissions and connector authority. They are not an unrestricted autonomous agent and do not imply authority to send, publish, spend or modify records.

### Business Impact / AI Value Measurement (future)

`Work Eliminated → Work Accelerated → Work Improved`

Measure defensible outcomes: time saved, response-time improvement, leads recovered, opportunities identified, processes automated and conversion/revenue influence. Relate measurements to business goals, evidence, baselines, observation periods and attribution uncertainty. Distinguish estimated savings and influence from observed results; avoid claiming causal revenue gains without support. Raw AI task counts are operational usage measures, not the primary measure of value.

### AI Visibility → AI Reputation & Evidence (future)

Preserve current exact-observation integrity. Evolve toward understanding how major AI/search systems understand, cite, mention and recommend a business; associations with locations/services/topics; supporting web/entity/reputation evidence; appropriately sourced competitor comparisons; and change over time. See the [presence and observation architecture](./foundations/SEO-AND-AI-VISIBILITY.md#ai-reputation--evidence--approved-roadmap-direction). This does not change current observation execution semantics.

### Strategic watch items — intelligence signals only

Monitor conversational advertising/sponsored agents; increasingly autonomous Google/Meta advertising; visual and multimodal AI discovery; broader paid-acquisition orchestration; Australian AI governance/regulatory developments; Australian data-residency/privacy expectations; emerging agent interoperability/tool protocols; and material changes in model/provider privacy, ZDR and data-retention policies.

These are watch signals for future proposals, not committed features or statements of current legal compliance. Apply the [Briefing → DigitalGate development loop](./foundations/BUSINESS-BRAIN-KNOWLEDGE.md#briefing--digitalgate-development-loop): compare against current architecture/product, propose a change, obtain Ben approval, capture it in roadmap/Brain/docs, then implement when appropriate. Model privacy claims require current provider/account evidence; `store: false` is not ZDR.

---

## North star (wow moment)

A new agency signs up, connects website + Google + Meta + Analytics + Stripe + email.

Within minutes the dashboard shows:

- **Business Health: 78/100**
- **AI Visibility Score™: 62/100**
- **17 opportunities** to improve visibility and vendor lead generation

That's the moment people remember. Every sprint should move toward this.

**Promise:** DigitalGate connects your business, understands what’s happening, and helps you act on it — then **learns** from the outcome.

---

## What DigitalGate wins on

Not feature parity with HubSpot.

> **One platform to run, understand and grow your business.**  
> Category: AI-powered **Business Operating Platform** — not primarily a marketing platform.  
> Full GTM: [strategy/DIGITALGATE-ROLLOUT.md](./strategy/DIGITALGATE-ROLLOUT.md).

---

## Four workstreams (parallel, prioritised)

| # | Workstream | Priority | Status |
|---|------------|----------|--------|
| **1** | Platform Core | **Highest** | 🔄 In progress |
| **2** | Real Estate App (Roe) | High | ⏳ After Core stable |
| **3** | Competitive advantage (AI Visibility, Twin, BI) | Medium | 📐 Designed |
| **4** | Connectors ecosystem | Later | ⏳ After Core + RE |

**Stop inventing new customer Apps.** One exception: **Command Centre** (internal) — see below.

---

## Workstream 5 — Command Centre (internal, parallel)

**Not a customer App.** The OS DigitalGate uses to run DigitalGate.

| Phase | Scope |
|-------|-------|
| **Now** | Manifest, types, ADR, architecture doc ✅ |
| **Aug 2026 ops slice** | `/command` ops home (pulse, today’s actions, deep links), Client Intelligence signals, Platform Health (connectors/Stripe), Revenue + Refer & Earn snapshot ✅ |
| **Aug 2026 intelligence slice** | Success Score™ + Agency Health Ranking, AI Advisor, Growth Reports, Opportunity Engine, Benchmarking, Feature Flags UI ✅ |
| **Later** | Historical Twin score trends, auto-send Growth Reports, Support Centre |

Does **not** block Platform Core or Real Estate. Built on the same Twin + Scoring pipeline as the customer wow moment.

Full spec: [COMMAND-CENTRE.md](./COMMAND-CENTRE.md)

---

## Workstream 1 — Platform Core (honest status)

| Component | Scaffold | Production-ready |
|-----------|----------|------------------|
| Multi-tenancy (`organisation_id`) | Native schema/runtime implemented | Deployed native runtime; current end-to-end verification recorded above |
| Organisations | ✅ Provision + Clerk webhook | ⚠️ Neon live ops still Ben |
| Users / Memberships | ✅ Schema + invite | ⚠️ Clerk → DB on sign-in / webhook |
| Roles & Permissions | ✅ Feature Registry + `requireFeature` | ⚠️ Role gate (owner/admin write); per-membership grants later |
| App Registry | ✅ Manifests + registry | ✅ |
| Universal Objects | ✅ Types + schema; Contact → App Role ([CONTACTS-AND-APP-ROLES](./foundations/CONTACTS-AND-APP-ROLES.md)) | ⚠️ Contact CRUD live; guests Contact-linked |
| Event Bus | ✅ In-process + CRM/referral producers | ✅ Fan-out → in-app Notifications |
| Platform API | ⚠️ Partial (`/portal/me` bridge) + Core CRUD | ⚠️ Expanding `/api/v1` |
| Billing | Stripe checkout + portal implemented | PR #1006 release BLOCKED; tests and code do not prove paid signup readiness |
| **Refer & Earn** (Platform SaaS referrals) | ✅ MVP + P2 + Partner tiers + Connect cash | ✅ Credit on first paid + months 2–12; Customer 20% / Partner 25% / Reseller **25%**; invite Resend/queue; cash via Stripe Connect Express (opt-in `STRIPE_CONNECT_ENABLED`) — [REVIEWS-AND-REFERRALS.md](./foundations/REVIEWS-AND-REFERRALS.md) §A |
| Feature Flags | ✅ Org settings JSON + `/api/v1/org/feature-flags` | ⚠️ No Command UI yet |
| Audit Logs | ✅ Schema + write path | ⚠️ Partial coverage |
| Notifications | ✅ In-app bell + Notification model | ⚠️ Push/OS still planned (PWA Phase 2) |
| AI Assist | ✅ `/api/v1/ai/assist` | ✅ Real OpenAI/Anthropic when keyed; template fallback |

**Next:** AI on more CRM/RE workflows → Roe RE v0 depth → remaining Connectors reliability.

**Roadmap (planned):** **AI Brand Studio** — Core capability (not Logo Maker). Business Profile → logo / palette / type / favicon / guidelines with AI iteration; optional entry from Website Builder; writes brand into profile for Websites, Email, Docs. Spec: [foundations/BRAND-STUDIO.md](./foundations/BRAND-STUDIO.md). V1 stays small; expand asset packs after validation.

**Architecture locked (Aug 2026):** **Gen 2 Architecture & Product Considerations Brief** — canonical north-star constraints (§§1–36). Immediate Priority 1–15 = foundations filter. Does **not** authorize building everything. Spec: [architecture/GEN-2-ARCHITECTURE-BRIEF.md](./architecture/GEN-2-ARCHITECTURE-BRIEF.md) · [ADR 0012](./adr/0012-gen-2-architecture-brief-adopted.md).

**Architecture locked (Aug 2026):** **Industry Intelligence** — Core capability (not “News”, not a standalone App initially). Pipeline: Collect → Filter → Understand → Personalise → Act. Industry Apps define feed profiles; consumers include AI Service, Universal Search, Reporting, Notifications, Opportunity Engine™ / Command Centre. Copyright: summarise/analyse + attribute — do not reproduce full articles. Phase 0 = docs; Phase 1 = RE curated briefing stub. Spec: [foundations/INDUSTRY-INTELLIGENCE.md](./foundations/INDUSTRY-INTELLIGENCE.md). **Do not build** a full news crawler/aggregator now.

**Architecture locked (Aug 2026):** **Platform Intelligence Layer** (Platform AI / Platform Knowledge) — foundational Gen 2 AI capability. Stack: DigitalGate AI → Platform Knowledge Layer (Documentation \| Live Platform \| Connectors) → Context/RAG → Model Router → Answer + Action Engine. Three knowledge levels: Platform / Business / Live. Super Admin AI ties to Command Centre (cite sources; 🟢/🟡/🔴 confidence). Product split: DigitalGate AI (your business) vs DigitalGate Platform AI (DigitalGate itself). Floating support chat stays thin UX — migrate onto this layer later, do not rip out. Phase 0 = docs + ADRs; Phase 1 = Super Admin RAG + citations; Phase 2 = org-scoped live tools; Phase 3 = diagnose + propose; Phase 4 = act-with-confirm. Spec: [ai/PLATFORM-INTELLIGENCE.md](./ai/PLATFORM-INTELLIGENCE.md). **Do not build** the full agent product now.

**Architecture locked (Aug 2026):** **Business Services** (Core capability) → customer **Business Setup / Start Your Business** (not Growth App, not “ASIC App”). Launch stages: **Identify → Register → Establish → Build → Connect → Grow**. Flow: DIGITALGATE → Business Identity → ABR (+ ASIC later) → Business Profile → Website/Email/CRM → SEO·AI Visibility/Automation/Analytics. **ABR** = verify/enrich (`SearchByABNv202001`, `SearchByASICv201408`; GUID server-only); **ASIC** = AU names/companies via DSP APIs (**hold** — apply to webservices@asic.gov.au; test env only after approval; no production submit / no scrape). Spec: [foundations/BUSINESS-SETUP.md](./foundations/BUSINESS-SETUP.md). Phase 1 = ABR Identify live-ish; next = Establish/Connect wiring (parallel to DSP application).

**Architecture locked (Aug 2026):** **Services App** — DigitalGate **operating system for service businesses**, not a ServiceM8 clone. Benchmark ServiceM8 for AU field-ops coverage; implement on **Universal Objects** (Contact, Company, Lead, Opportunity, Quote, Invoice, Payment, Task, Activity, Document) + Services-owned Job / Appointment / Checklist / Contract. One App; industry via **Service Templates**. AI Job/Quote/Scheduling assistants are differentiators (phased). Spec: [foundations/SERVICES-APP.md](./foundations/SERVICES-APP.md). Closed-beta job ops shipped; calendar / field / recurrence / AI assistants next.

**Shipped (Aug 2026 Core slice):** Platform Refer & Earn MVP (`/r/{code}`, Settings dashboard, invite email stub, first-paid credit); CRM lead create upserts Contact; Lead → Opportunity convert + CRM Opportunities list.

**Shipped (Aug 2026 Refer & Earn P2):** Stripe `invoice.paid` monthly referral credits (months 2–12, idempotent); invite delivery via Resend when `RESEND_API_KEY` set else branded Activity queue; cash payout threshold UI (ledger stub).

**Shipped (Aug 2026 Refer & Earn Connect cash):** Stripe Connect Express (AU) onboarding; transfer at ~A$100 threshold; Settings → Refer & Earn Connect status + request payout; webhooks for `account.updated` / transfer failure reversals; opt-in `STRIPE_CONNECT_ENABLED` (graceful UI when unset). Platform credit remains default.

**Shipped (Aug 2026 Refer & Earn ops):** Webhook setup script/docs register + update `invoice.paid` + Connect transfer events; Gen 2 route acknowledges unknown Stripe events; Commerce checklist reminds Ben to enable renewals event.

**Shipped (Aug 2026 Connectors):** Org WordPress connector host/key UX, `dgdev_` validation, CVH site-key requirement, Test connection probe without key rewrite; RE probe treats empty vendor inbox as connected (auth OK).

**Shipped (Aug 2026 AI on CRM):** Lead/opportunity/contact AI assist — draft follow-up + summarise (template generation from Business Profile + record context).

**Shipped (Aug 2026 Commerce):** AU tax invoices & quotes (Business Profile letterhead, GST 10%, print/PDF), quote→invoice, Commerce **Reports** (P&L, GST, Balance Sheet scaffold, Cash Flow). Core/commerce-adjacent — not Xero/MYOB; AU Country Pack tax conventions on Business Profile (`taxSettings`, `bankDetails`). Logo/icon on invoice & quote letterheads.

**Shipped (Aug 2026 Core completeness):** Real LLM router (`OPENAI_API_KEY` / `ANTHROPIC_API_KEY`) behind `/api/v1/ai/assist` with template fallback; Partner/Reseller referral tiers; in-app Notifications from event bus; org feature flags API; CRM leads/opportunities feature gates; lead stage events; WP multi-site connector guidance.

**Shipped (Aug 2026 Network foundations):** Reputation Growth App MVP (`/apps/reviews` — Acc `dg_reviews` feed, Reputation Score™ when real data exists, AI themes LLM/stub, request queue after stay/settlement); Marketplace browse (`/dashboard/marketplace` — Software/Services/Professionals/Partners/Integrations); Business Referral Network scaffold on Contact (`/dashboard/network`) — Free/Reciprocal/Paid/Commission disclosed, separate from Platform Refer & Earn.

**Exit criteria:** Sign up → org in DB → create contact → timeline event — no wp-admin.

---

## Workstream 2 — Real Estate App (Roe flagship)

**One excellent App.** Full vendor workflow on Gen 2:

```
Vendor Lead → Appraisal → Listing → Marketing → Offers
    → Contract → Settlement → Past Client → Review → Referral
```

| Phase | Scope |
|-------|-------|
| **RE v0** | Vendor leads + pipeline (port from Gen 1) |
| **RE v1** | Listings + appraisals |
| **RE v2** | Full workflow above on Roe daily use |

Roe Realty = production tenant and case study. WP admin optional for agents.

---

## Workstream 3 — Competitive advantage

Build **after** Core is stable and RE v0 is flowing data.

| Priority | Capability |
|----------|------------|
| 1 | AI Visibility Engine™ + score |
| 2 | Digital Twin™ snapshot |
| 3 | BI Engine + recommended actions |
| 4 | Business Growth Score™ |
| 5 | AI Assistants (via AI Service) |

These are the moat — powered by **connected data**, not isolated features.

---

## Workstream 4 — Connectors (ecosystem)

**Canonical priority:** [foundations/CONNECTOR-PRIORITY.md](./foundations/CONNECTOR-PRIORITY.md) — Tier 1–10, DigitalGate 15, immediate programme. APIs are not the product; DG is the intelligent layer.

**Immediate programme (Gen 2):** ABR · ASIC (DSP apply) · Dreamscape · Google · Stripe · REA · Domain · RP Data / CoreLogic.

After Core + RE v0 depth, expand along DG15 (Meta, Model Router providers, ElevenLabs/Twilio, Xero, Cloudflare) — not a scatter of fifty vendor Apps.

Each connector improves Twin, BI, and AI recommendations.

### WordPress detach (parallel to Core + RE)

ADR: [0002 — WordPress as Connector](./adr/0002-wordpress-as-connector.md).  
Executable tickets: **[WP-DETACH-BACKLOG.md](./WP-DETACH-BACKLOG.md)** (P0 guardrails → P1 Roe SoT → P2 portal/billing → P3 support+health → P4 CVH → P5 public/headless).

Value order: Roe ops independence before CVH booking engine before public sites. WP stays a connector for forms/public mirror/health probes — not Platform Core.

**Aug 2026 slice:** AccommodationUnit Neon SoT (soft) + HK Neon-first; Gen 2-first stay create behind `acc.gen2_first_booking`; Roe lead dual-write webhook (`dg-leads`) + optional stage write-back (`re.stage_writeback`). Plugin **v10.68.0**. Still WP: public book-now/Stripe guest pay, portal/support/health, RE appraisal form capture origin, headless CMS.

---

## Workstream 6 — Platform performance & PWA

Make the web app feel like desktop software before investing in native apps.

| Phase | Scope | Status |
|-------|-------|--------|
| **1 — Feel like software** | Request dedup, parallel fetch, skeletons, prefetch, PWA manifest | ✅ Done |
| **2 — PWA polish** | Service worker, offline shell, push notifications | 🔄 In progress |
| **3 — Mobile apps** | Industry-specific (RE, Accommodation, DG staff) | ⏳ Later |
| **4 — Desktop app** | Electron/Tauri when OS integration adds value | ⏳ Later |

Targets: dashboard < 2 s, navigation < 300 ms, CRM updates optimistic. Full spec: [standards/PERFORMANCE-STANDARDS.md](./standards/PERFORMANCE-STANDARDS.md).

---

## 24-month phases

| Phase | When | Focus | Commercial gate |
|-------|------|-------|-----------------|
| **1 — Foundation** | Now | Platform Core + RE App + Roe as tenant | **Gate 1** Internal Alpha |
| **2 — Validation** | +6 mo | **5 founding** agencies first (3–5 RE + 2–3 SME); not unpaid QA | **Gate 2** Founding Customer Programme (not cleared until pre-sell) |
| **3 — Commercial launch** | +12 mo | Public SaaS, billing, onboarding, support | **Gate 3** Public Launch (~10–20 active) |
| **4 — Expansion** | +18 mo | Accommodation, Finance, more Connectors · Country Packs ready | **Gate 4** Scale (50–100+) |
| **5 — DigitalGate Network** | +24 mo | Community · B2B partner graph · Marketplace · Reviews / Referrals · SDK / third-party Apps · enterprise · international communities | After validation (🟢) |

Operating target + honest gap status: [COMMERCIALLY-READY-V1.md](./foundations/COMMERCIALLY-READY-V1.md).

**Phase 5 detail:** [foundations/NETWORK-LAYER.md](./foundations/NETWORK-LAYER.md). Gen 2 foundations scaffold (Reviews / Marketplace / B2B referrals) shipped Aug 2026; ship full Community when enough active businesses make the network useful.

**Referrals — two products:** (A) **Platform Refer & Earn** ships with / after Billing (Core) — customers refer DigitalGate. (B) **Business Referral Network** + **Reviews** — foundations scaffold live (`/apps/reviews`, `/dashboard/marketplace`, `/dashboard/network`); depth Phase 5+: [foundations/REVIEWS-AND-REFERRALS.md](./foundations/REVIEWS-AND-REFERRALS.md).

**Website Builder (MVP shipped):** AI Website Studio — Business Profile → structured page/component model → `/sites/[slug]` renderer + forms→CRM. WP migrate via Connector (separate). Domains/Hosting/SSL are **Infrastructure**, not Website Builder: [foundations/WEBSITE-BUILDER.md](./foundations/WEBSITE-BUILDER.md) · [foundations/INFRASTRUCTURE.md](./foundations/INFRASTRUCTURE.md).

**Infrastructure (App hierarchy layer):** Provider-agnostic domains/DNS/hosting/SSL/**email** — **Dreamscape first** for domains/DNS/mailbox; **Resend** for transactional. Customer UX = DigitalGate Domains/Hosting/Email (never provider brand). **Sandbox only** for Dreamscape until automated tests pass. Email architecture: [EMAIL-INFRASTRUCTURE.md](./foundations/EMAIL-INFRASTRUCTURE.md). Domains MVP after Website Builder MVP.

**Canonical App hierarchy (locked):** [foundations/APP-HIERARCHY.md](./foundations/APP-HIERARCHY.md)

```
Core → Infrastructure → Industry → Growth
```

**Execution priority until Phase 5:**

```
Core → Infrastructure → Connectors → AI → Industry Apps → Growth → Scale
```

---

## Tomorrow morning (ordered)

These five are **done** (Neon live, Clerk webhook, contacts API, CRM UI). Do not re-run as a bootstrap:

1. ~~Provision Neon Postgres~~ ✅  
2. ~~`npm run db:push`~~ ✅  
3. ~~Clerk webhook live~~ ✅  
4. ~~Platform API v0 contacts~~ ✅  
5. ~~CRM contacts UI on Platform API~~ ✅  

Current daily work: Founding 10 commercial lock, public sites, Design Studio / Infrastructure, Command Centre dogfood.

---

## What we are NOT doing

- ❌ New Apps (Finance, Creator, etc.) until RE workflow proven  
- ❌ HubSpot feature checklist  
- ❌ Major Gen 1 WP modules  
- ❌ Features that fail the Core / RE filter  
- ❌ Full Community / social network before critical mass (foundations scaffold OK — see NETWORK-LAYER)  
- ❌ Paid/Commission B2B referral settlement / compliance packs before Country Pack gates (scaffold + disclosure UI OK — see REVIEWS-AND-REFERRALS)  
- ❌ MLM / multi-level on Platform Refer & Earn (single-level SaaS only)  
- ❌ Arbitrary AI PHP on Gen 2 Platform Core (WP stays Connector; native builder is structured model — see WEBSITE-BUILDER)  
- ❌ Fifty one-off vendor integrations / “Google Reviews App” / “ASIC App” — use Connector Layer + DigitalGate 15 ([CONNECTOR-PRIORITY.md](./foundations/CONNECTOR-PRIORITY.md))  
- ❌ Full Industry Intelligence news crawler / article republisher (architecture + RE curated briefing later — [INDUSTRY-INTELLIGENCE.md](./foundations/INDUSTRY-INTELLIGENCE.md))  

---

## Milestone tracker

| Milestone | Status |
|-----------|--------|
| app.digitalgate.com.au + Clerk | ✅ Done |
| Architecture IP (`docs/`) | ✅ Done |
| Platform Core scaffold | ✅ Done |
| Command Centre architecture | ✅ Done |
| **Platform foundations (15 docs)** | ✅ Done |
| **Commercially Ready v1 lock** | ✅ [COMMERCIALLY-READY-V1.md](./foundations/COMMERCIALLY-READY-V1.md) |
| **Gate 1 — Internal Alpha** | 🔄 Mostly ready (dogfood); ugly-list + ops env |
| Contact API + CRM UI | ✅ Contacts / opportunities live; Tasks still partial |
| Roe vendor leads on Gen 2 | 🔄 RE closed beta — WP capture still required |
| Billing checkout / Stripe hygiene | 🔄 Partial — pay path exists; SaaS UX thin |
| Wow moment dashboard | ⏳ Honest scores only |
| **Gate 2 — Founding customers (5 agencies)** | ⏳ Not cleared — scoped pilot after pre-sell 6 reds |
| **Commercially Ready v1 (launch statement)** | ⏳ Ben still glue for connectors / support / onboarding |

---

## Company (not just product)

As you grow, hats to plan for: Product · Engineering · Design · Customer Success · Sales · Marketing · Partnerships.

You wear several today — that's fine. Document so roles can split later.

---

## Related documents

- [docs/README.md](./README.md) — architecture IP index  
- [strategy/DIGITALGATE-ROLLOUT.md](./strategy/DIGITALGATE-ROLLOUT.md) — canonical GTM / rollout  
- [foundations/COMMERCIALLY-READY-V1.md](./foundations/COMMERCIALLY-READY-V1.md) — commercialisation operating target  
- [PRODUCT-VISION.md](./PRODUCT-VISION.md)  
- [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md)  


### Approved Prospecting navigation release — 12 October 2026

- Requirement: `growth.prospecting_modes` / Prospecting navigation.
- Approval: operator instruction “COMPLETE PROSPECTING NAVIGATION RELEASE”, 12 October 2026.
- Approved order: Overview → Discover → Prospects → Pipeline → Today → Activity.
- Scope: reorder existing manifest and shared navigation; preserve routes, permissions, aliases, responsive rendering and highlighting.
- Implementation: `packages/platform-core/src/apps/navigation.ts` and `packages/platform-core/src/apps/builtins/prospecting.ts`; isolated branch `fix/prospecting-navigation-order`, based on production/main `6793e372`.
- Verification: regression tests in `scripts/test-prospecting-navigation-order.mjs`; 11/11 navigation tests passed (390px mobile and 1440px desktop, all six active tabs); TypeScript, page hierarchy, full prebuild (886 passing TAP assertions plus script checks), production build and diff checks passed. Changed-file lint: zero errors, three existing warnings. Browser fixture tests are not authenticated production verification.
- Release evidence: implementation commit `216e4499`; [PR #1012](https://github.com/w7tcv2m7tk-netizen/dg-platform-web/pull/1012). CI and production deployment pending; authenticated production verification remains required.
- Status: implemented; production verification pending. Not VERIFIED COMPLETE. This navigation correction does not complete the wider Prospecting requirement.
- Next action: validate the isolated diff, review PR checks, release only the navigation correction, then verify authenticated desktop/mobile navigation and all six routes.


### Backlog completion evidence — 21 October 2026

#1011 governance is merged (`6cb5da95`), isolated from checkout implementation.
#1009 default-OFF briefing foundation is merged (`385b1c3b`); this does not activate
briefing generation, voice or new provider calls. Both integrated candidates
passed the complete `npm run build`, including prebuild suites and TypeScript.
Roadmap certification passed 8/8; briefing checks passed 10/10; changed briefing
module lint passed. No Neon preview was created for these updates.

#1013's reminder/evidence comparison is completed in
[customer checkout certification](commerce/CUSTOMER-CHECKOUT-CERTIFICATION.md).
AIM Financial and My Venue Clean remain individually HOLD for actual checkout
certification. #1014 remains open: implemented repository guidance is only part
of its operating-controls acceptance criteria. No task is closed merely to
reduce the open-item count. #1016 → #1006 → #1015 remains the commercial release
order; #1018 retains its authenticated local-verification and identity-migration
gates. No live billing activation or Production migration was performed for this
backlog reconciliation.

### P1 Prospecting candidate reconciliation - 21 October 2026

PR #1018 candidate `09a85fb7` reconciled main `d7abf8fd`; preserved its
Today’s Priorities/follow-up coverage rather than the older qualified-only
source assertions. No Prospecting product logic changed in this merge.
Fresh checks: owned disposable acquisition integration 16/16, concurrency
11/11, intake/report/navigation 71/71; complete `npm run build` including
prebuild and TypeScript passed. The initial sandbox build was interrupted
while compiling; the full rerun outside the sandbox passed. The local
cluster was stopped and removed. Provider/route mocks are not authenticated
application certification. Status remains BLOCKED pending an accessible
Clerk development dashboard, verified webhook isolation and a supported
local synthetic authenticated application context. No migration applied
to Production; identity migration approval and deployment remain separate.
No Neon Preview resources or automatic Preview deployments were created.

### Local synthetic authentication support - 21 October 2026

Requirements: `platform.auth`, `growth.pipeline`. Branch
`fix/local-synthetic-auth`, based on `a7d2bf11`. Added explicit local-only pairing,
an owned disposable PostgreSQL/loopback Next development launcher and refusal
coverage. Reuses actual Clerk middleware and session/tenant checks; no auth,
billing, entitlement, webhook, schema or Production configuration was changed.
Local-only guard tests 26/26; existing pairing/verification regressions 34/34;
changed-script ESLint passed. Actual local cluster/schema bootstrap and Next
startup succeeded; all attempted owned clusters were stopped and removed.
Real Clerk test-mode email-code sign-in succeeded and reached `/post-login`.
The authenticated dashboard and attention/notification APIs returned HTTP 200.
Matching Next bind hostname to localhost app origin resolved the local refresh
loop; both test keys also have matching public signing-key IDs. Four narrow
shared-shell imports were changed to existing client-safe modules to avoid
server Node dependencies in development browser bundles. No middleware auth
exception was retained. Synthetic local fixtures used normal owner membership
and explicit local exempt subscriptions, not real paid customer state. One
reserved-email Clerk Development user was prepared and retained for local tests.
Owned clusters/servers were stopped and destroyed after testing. No remote
webhook, Production, Vercel, Neon or billing objects/configuration changed.
Full authenticated Prospecting/tenant-isolation certification remains BLOCKED:
browser navigation timed out; the direct cross-tenant detail probe ultimately
returned HTTP 405 (GET is unsupported), so it provides no tenant-isolation proof. Next action: complete those UI checks on the working
isolated local auth setup; do not relabel this login/shell smoke as release
certification. Local support implementation does not approve a Production release.

Final local support validation: complete `npm run build` including prebuild,
TypeScript and optimized compilation passed on the final implementation;
Prospecting intake/report/navigation regression 71/71 and sidebar fallback/
metadata checks passed. Local mode refusal tests 26/26 and original environment
guards 34/34 passed. ESLint: zero errors, one existing AppContextNav unused
pageTitle warning. Framework/build warnings remain; no checks were disabled.


### Authenticated Prospecting verification - 21 October 2026

Requirements: `platform.auth`, `growth.pipeline`. Actual Clerk Development
email-code session, normal synthetic owner membership, owned disposable
loopback PostgreSQL and localhost Next development app; no authentication
bypass, Production access, Neon preview, deployment or remote migration.

PASS: Prospecting first among permitted Growth items on desktop and mobile
(390x844); default Today's Priorities shows three synthetic relationships and
Research Priority; manual intake POST returns 201; Delete archives the new
record, active count returns from four to three, archived view offers Restore.
Other tenant prospect absent from list and direct page returns 404. Existing
CRM company/contact linking succeeds; retry retains one relationship activity
and the original contact.companyId. Activity renders that relationship event.
Name/ABN searches fail safely without provider credentials and never assert
verified identity. Report sharing/export stays disabled without audit evidence.

FAIL: Pipeline calls the same unresearched value Opportunity Score instead of
Research Priority, including in its aggregate score copy. Reproduction: add an
unverified manual prospect with industry Real estate, leave research absent,
then compare Pipeline (Opportunity Score 38) with Priorities (Research Priority
38). No correction made during verification.

BLOCKED/NOT CERTIFIED: positive ABR/Google results and verified ABN persistence
(no provider credentials in the isolated launcher); existing customer commercial
record preservation; qualified call brief and follow-up/consultation selection
require further authenticated fixture scenarios. These results are not full
release certification. AUTHENTICATED APPLICATION CERTIFICATION: HOLD.
Evidence retained outside Git in Verification/ProspectingApp/20261021, including
desktop/mobile screenshots and application request log. Prior full npm build
including prebuild/TypeScript remains applicable: no runtime code changed in
this verification. No merge or deployment authorised by this evidence.


### Prospecting release completion candidate - 21 October 2026

Requirements: `growth.pipeline`, `platform.auth`; PR #1018, branch
`release/prospecting-intake`. Corrected Pipeline score labels to use the actual
scoring result's Research/Contact priority type, including discovered prospects.
Stage averages carry their priority type and are suppressed for mixed types.
Rendering regression exercises both types with the real scoring engine.

Validation on the corrected working tree: intake/rendering 13/13; report, mobile
and navigation regressions 60/60; additive migration and acquisition local DB
16/16; P1 concurrency 11/11; targeted ESLint zero errors/warnings; complete
`npm run build` including all prebuild checks, TypeScript and optimized build
passed (existing framework warnings remain). No checks disabled.

Authenticated localhost acceptance with the retained Clerk Development fixture
account: corrected Pipeline labels visible; due follow-up and consultation
appear in Top 3; finance call brief opens with explicit synthetic audit evidence
and no real-estate appraisal claims. Explicitly selecting a synthetic existing
customer, company and contact succeeds. Exact before/after customer, membership,
subscription/entitlement, CRM and prior communication snapshots are identical.
This supplements the preceding manual create/archive, tenant denial, mobile
navigation and Activity checks. All evidence is synthetic; no real commercial
activation or external message occurred. Owned local cluster removed.

Vercel metadata confirms ABR_GUID and GOOGLE_PLACES_API_KEY configured for
Production. Values were not retrieved; positive live provider response remains
unverified. Local provider failure tests and synthetic provider regressions
are not live ABR/Google certification. Preview DB URLs remain absent.

Production is unchanged. Release requires explicit approval of migration
`20261020090000_unified_acquisition_identity` (four nullable columns, format
checks, tenant-scoped unique indexes; no backfill/merge/reassignment), followed
by #1018 merge and Production deployment. Recheck Production migration state
and drift read-only before applying only that migration; never deploy all
pending migrations or alter migration recovery. Verify live read-only provider
search and authenticated UI after release, without creating live test prospects.
No checkout, Stripe, entitlement or webhook implementation changes included.


### Approved Prospecting Production rollout - 21 October 2026

Requirements: `growth.pipeline`, `platform.auth`. Operator explicitly approved
the exact identity migration, #1018 merge and Production deployment. Applied
only `20261020090000_unified_acquisition_identity` in an atomic transaction
with its checksum record: 724683fc03047fd36c9df1b49b170d467fcf5a1d5026fbcb412b5fa76da7f612.
Verified four nullable columns, two validated format checks and both tenant
unique indexes. Prospect count 51, unknown-owner prospects 43 and companies 15
unchanged; no backfill. Existing migration/recovery rows were not modified.

#1018 merged as `06d47650f85d8534afcace7564292f4e2380438c`; Vercel deployment
`dpl_ByeBkme9WDx7to5Wt4s3aibgG451` READY with app.digitalgate.com.au assigned.
No Preview deployment/Neon branch created. Early error/fatal runtime log scan
returned no records (limited window, not complete runtime certification).
Local application acceptance and full build passed as recorded above.
Authenticated Production/provider acceptance remains pending because the
available browser is signed out. No authentication bypass or synthetic writes
against Production. Next action: owner signs into the open in-app DigitalGate
tab; verify Priorities, controls, existing Activity and read-only ABR/Google
search. Do not claim live provider verification from configuration metadata.
Evidence: Verification/ProspectingRelease/20261021/release.json. This entry
supersedes the migration/release HOLD only; provider acceptance remains open.

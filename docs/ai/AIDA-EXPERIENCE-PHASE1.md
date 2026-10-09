# Aida Experience and Business Intelligence — phase 1

## Discovery and reusable infrastructure

Baseline: origin/main 5a08e2f7; isolated worktree `/private/tmp/dg-aida-phase1`, branch `feat/aida-business-briefing-phase1`. No commercial checkout worktrees or PRs are modified.

- Business Overview: `src/app/(shell)/dashboard/page.tsx` assembles organisation-scoped live metrics, connector probes, persisted health history, business profile and goals. `BusinessOverviewDashboard` places the DigitalPerformanceStrip (Growth Performance) after Executive pulse. Its existing `dailyBriefing` is an internal summary, not an attributed external industry bulletin.
- Chat: shell `ChatWidgetProvider` exposes `openSupportChat(draft)`; SupportChatPanel and support APIs use the active PlatformSession. SupportConversation is unique by user and organisation and SupportMessage belongs to a conversation. Anonymous public Aida has a separate token-authenticated AidaConversation; it must never inherit confidential customer history. Searchable history and explicit business/session history segregation require further work.
- Brain: approved knowledge, organisation profile/goals, source registry and Twin evidence already feed Advisor. Reuse `getBusinessContext`, `getApprovedKnowledgeContext`, `buildBusinessBrain`, `buildLiveTwinWithScores` and the existing evidence context. Do not build another memory system.
- Routing: `ai/llm.ts` is the shared provider router; Advisor, platform intelligence and support reply still use it directly. `ai/gateway.ts`, `policy.ts`, model registry, routing evidence, local jobs and recipient approvals provide the newer governed CRM execution path. Only lead_summary/lead_follow_up are currently registered policy tasks. New voice/briefing tasks require explicit classification, capabilities, approved recipients, output budgets and policy tests; existing legacy calls cannot be assumed fully gateway-governed.
- Permissions/actions: active session resolves membership and tenant; access buildAccessContext/hasPermission supports module/action/scope. AI tools have a registry, confirmation and ledger executor; API authority and write entitlement guards remain mandatory. CRM follow-up links are tenant-validated. Models propose; authenticated DigitalGate APIs execute. Voice confirmation must not bypass those checks.
- Onboarding: Gen2 journey/progress, operating profile, setup status, onboarding banners and first-day Aida already exist. Use their actual completion evidence and next route instead of creating a second checklist.
- Industries: catalogue/taxonomy, templates, canonical active industry selections, specialist entitlements and beta gates distinguish core apps from industry capabilities. Property/Real Estate is the first adapter; no global real-estate assumptions belong in the shared briefing contract.
- Intelligence: existing business intelligence, advisor briefing, benchmarks, opportunity engine, property intelligence and business-discovery research provide candidate evidence. Prospecting research is not automatically an approved customer daily briefing feed. Licensing, geographic/entity match, freshness and provenance need validation before reuse.
- Entitlements: `assertEntitlement(..., "useAi")` already gates Advisor; subscription/write entitlement and specialist industry gates exist. Viewing an approved cached briefing should use intelligence view permission; generation, speech and AI replies must separately enforce relevant subscription entitlement and usage budgets. A feature flag is not a paid entitlement.
- Business scope: current Business Profile is organisation-scoped; no independent Business entity/active-business selector is present in this path. Phase 1 explicitly maps businessId to the authenticated organisationId. A multi-business organisation needs a verified membership-to-business resolver before any independent scope is accepted.

## Unified target architecture

One conversation orchestration service over the existing Brain, Twin, router and action executor, with text, transcription, voice and playback as channel adapters:

1. Resolve authenticated active organisation, actor, membership, business and channel permissions server-side. Never accept a client organisation ID as authority. Recheck access on every history read, turn, stream reconnect and tool execution. Abort pending streams and clear client drafts/history on tenant switch.
2. Build a bounded evidence envelope from authorised Brain knowledge, current onboarding state, geographic business profile and verified Twin measurements. Source-level permissions must hold before evidence is included. Cached aggregate briefings must not expose evidence the reader cannot view; use permission-class cache segmentation or redact/rebuild.
3. Intersect source classification and approved recipient policies; route through extended DigitalGate gateway tasks. Missing provider approval means unavailable, with no wider fallback. Public external research is collected separately from confidential metric synthesis.
4. Persist accepted user turns and assistant text using the existing conversation ownership model. Add channel, immutable business scope, source references, classification, tool correlation and consent metadata through a separately approved schema proposal. Search uses tenant/business/actor predicates and permission rechecks; no global vector index or tenant-independent text cache.
5. Tools continue through existing registry/API permission, entitlement and confirmation guards, idempotency and audit ledger. Voice only proposes an action; sensitive changes need a visible review and explicit confirmation.
6. Voice UI offers a prominent Talk to Aida control, adjacent text input and accessible transcript. No getUserMedia on mount, navigation, briefing playback or automatic reconnect. States: idle, permission request, connecting, listening, thinking, speaking, paused, ended/error. Explicit stop releases tracks and transport; page exit/tenant switch ends the session. User can interrupt playback without initiating capture.
7. Transcription is available independently of recording. Audio recording is separately opt-in, off by default, with purpose, recipient, retention and deletion controls. No audio persistence without a current consent record. Transcript retention is a separate informed choice. Raw audio never enters logs or general Brain memory automatically.
8. Briefing playback consumes the same verified version as the visible text; permission is rechecked before signed audio access. Cache by organisation, business, briefing version, voice and approved recipient policy. Playback never requests microphone access.

## Reusable daily briefing pipeline (design only)

Schedule by business timezone, using existing authenticated cron/worker conventions. Resolve industry/geography from approved profile. Adapters gather licensed external sources and authorised internal metrics with timestamps, units, reporting window and source references. Property adapter should resolve sales vs property management, locality and market scope, and reject stale/unmatched property data. Other industries implement the same evidence adapter contract.

Combine external intelligence, verified performance, evidence-linked opportunities and recommended actions into 3–5 insights. Clearly distinguish observation, interpretation and recommendation; uncertainty is mandatory. Missing metrics remain unavailable, never zero or invented. Every recommendation must cite evidence and state why it matters. External text is untrusted content, never tool instructions.

Generation must use a newly approved gateway task. Validate schema, source references, geographic/entity scope, timestamp freshness, permission provenance and all numeric claims against source evidence before publication. If sources are insufficient, publish an unavailable status rather than filling the card. Require both external and internal evidence for a combined briefing; do not silently turn a single news item into a complete business briefing.

Persist immutable validated versions and generation status only after schema approval. Cache keys include organisation/business/industry/geography/reporting date, permission class and evidence/policy version. Expiry invalidates stale results; deduplicate schedule retries with a scoped idempotency key. Bound research requests, token/context sizes, concurrent jobs and daily spend; reserve budget before dispatch and meter actual text/audio usage with the existing ledger. Scheduled generation must never be triggered as a paid fallback by a dashboard read.

## Implemented safe slice

- `src/lib/business-briefing/contract.ts`: serializable versioned scope, industry/geography, insight rationale/action/uncertainty, timestamp and attribution contract; explicit presentation states and HTTPS link sanitisation.
- `retrieval.ts`: independently testable retrieval seam, permission/flag short-circuits, tenant/business mismatch rejection, expiry and source-reference checks. This is not a complete untrusted JSON decoder or publication validator; future persistence must validate runtime schema and metric provenance.
- `server.ts`: server-only active-session and intelligence-view boundary, server-derived business scope. Repository intentionally returns null: no approved daily feed is connected.
- `BusinessBriefing.tsx`: purple presentation with explicit empty/loading/error, ready attribution and timestamp rendering, existing chat draft entry, local Growth Opportunities anchor and disabled playback.
- Dashboard composition: server section under Suspense immediately before Growth Performance, without changing existing scorecard/overview data assembly.
- `AIDA_BUSINESS_BRIEFING_ENABLED=true` is the only enabling value; unset defaults OFF. No production configuration is changed. When OFF the briefing boundary does not resolve a session or read a repository. When ON the honest empty state appears for authorised viewers. There are no fixtures in production code, provider calls, recording, migrations or shared caches.

Ask Aida currently drafts a question about evidence requirements rather than injecting unverified briefing text into chat. Future ready briefings need server-side ID/version resolution for conversational evidence grounding; do not send the whole document as trusted browser context.

## Voice options and privacy/cost gates

Recommended first voice slice: an approved local STT adapter produces an editable transcript, then uses the same governed text turn; optional approved TTS reads the answer. Benchmark latency, Australian accents, device load and accessibility before choosing implementation. No local speech deployment is activated in this phase.

Browser speech synthesis is a useful playback prototype. Browser SpeechRecognition has limited availability and may send audio to a server; it must not be described as inherently private or offline. On-device recognition requires capability/language availability checks. See [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) and [Web Speech guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API).

A managed realtime speech adapter is an alternative after procurement and recipient approval. Require server-issued short-lived session credentials, bounded session duration, server-side context/tools and enforceable disconnect/budget controls. A provider-direct realtime session may bypass the current text policy gateway, so it requires an explicit governed adapter design rather than simply exposing a browser SDK. Compare latency/interruptibility with local STT + existing text routing + TTS; no vendor is activated or priced here.

Approve provider/data region/retention and recording deletion policy before activation. Treat mixed audio/transcripts/business context as tenant-confidential or stricter, including background speech. Set per-tenant daily limits, session duration, audio token/minute accounting, cancellation and fail-closed budget behaviour. Provider credentials stay server-side. Feature flag, entitlement, consent and recipient approval are independent gates.

## Remaining dependencies and next slice

Next: implement an approved read-only property evidence adapter with licensed external sources and existing Twin data, a strict runtime publication validator, numeric claim verification and server-resolved briefing ID grounding for Ask Aida. Rehearse it on isolated test data first. Persistence/cache/scheduler changes and production migrations remain subject to approval. Only after evidence publication is reliable should voice, searchable history and consent-based recording be implemented.

Required decisions: approved external sources/licensing, property/geographic coverage, multi-business identity model, source-level read permissions, recording/transcript retention, speech recipient approvals, quota/entitlement rules and provider budget. Phase 1 does not alter any existing commercial checkout PR, merge, deploy or production data.

## Verification results

- `npm run test:business-briefing`: 7/7 pass, including actual React static rendering of ready/empty/loading/error/hidden states. Fixtures exist only in the test file. Added to prebuild for future regression coverage.
- Focused Aida Business Overview, Brain order/depth, first-day experience and enabled-app client-boundary regressions: 7/7 reported tests pass.
- `npx tsc --noEmit`: pass.
- Changed-file ESLint: zero errors; one pre-existing BusinessOverviewDashboard image warning.
- `npm run lint`: fails with 144 errors/149 warnings across the repository; no changed-file errors. No unrelated lint fixes included.
- `npm run build`: all existing prebuild suites and build guards pass. Sandboxed Turbopack compilation stalled and was stopped. Approved local `npx next build` retry outside sandbox passes compilation, TypeScript, page generation and route output. No deployment performed. Existing middleware/cache-control/dynamic-doc-path warnings remain.
- Diagnostic `npx next build --webpack`: fails on existing DocumentBrandMark → platform-core barrel → Node builtin imports. The supported default Turbopack retry passes; no webpack workaround or configuration change included.
- `git diff --check`: pass. React checklist review: hooks are unconditional, states have status/alert semantics, actions are labelled, no microphone access or effects are introduced, serializable data crosses the server/client boundary and client code imports only the contract and existing chat hook.
- Browser visual QA was not performed; rendered output and dashboard placement are tested. Authenticated interactive chat behaviour is covered by existing regressions, not a new end-to-end session.

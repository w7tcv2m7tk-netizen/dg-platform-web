# DigitalGate Business Brain Knowledge

Status: Architecture baseline  
Owner: Platform Core / Business Brain  
First dogfood organisation: DigitalGate

## Purpose

Business Brain Knowledge is the durable organisational memory layer for DigitalGate. It exists so valuable decisions, principles, facts, strategies, ideas, insights and operating knowledge do not remain trapped in chats, meetings, emails, documents or individual memory.

The core product rule is:

> Sources are evidence. Knowledge is the governed organisational understanding extracted from those sources.

DigitalGate must preserve provenance while avoiding the opposite failure mode: treating every raw transcript or old document as equally current truth.

## Product principles

1. Complex underneath. Simple on top.
2. Could this be dramatically easier for the business owner?
3. Make the machine do the thinking where appropriate; make the human make the decisions that matter.
4. DigitalGate should increasingly prompt the owner with what needs attention rather than wait for the owner to operate the software.
5. Connect what already works. Build what makes DigitalGate unique. Intelligence ties everything together.
6. More connected context must make DigitalGate meaningfully more useful.
7. Important organisational truth is human-governed. AI may extract and recommend; consequential promotion to approved knowledge is controlled.

## Core loop

Source → Extract → Review → Approve → Retrieve → Reason → Recommend/Act → Observe outcome → Learn

The intelligence pattern used throughout the platform is:

Signal → Insight → Recommendation → Action → Outcome → Learning

Knowledge is one of the durable inputs and outputs of that loop.

## Source model

A source is evidence from which knowledge can be extracted. Examples:

- conversation
- meeting
- email
- document
- CRM activity
- website content
- platform event
- integration payload
- user entry
- research
- imported legacy material

Sources should retain, where available:

- organisation
- source type
- title
- external/source reference
- source application
- captured time
- author/participants where permitted
- hash/deduplication key
- ingestion metadata
- access classification

Raw source retention must respect privacy, security and data minimisation. Credentials, secrets, authentication identifiers and unrelated sensitive personal information must not be promoted into general Business Brain knowledge.

## Knowledge object

A Knowledge Item is an organisation-scoped, independently retrievable statement or concept.

Recommended fields:

- id
- organisationId
- type
- title
- statement/body
- status
- confidence
- importance
- scope
- sourceId/sourceRef
- sourceExcerpt or source locator where safe
- createdBy
- approvedBy
- approvedAt
- supersedesId / supersededById
- effectiveFrom / reviewAt
- metadata
- createdAt / updatedAt

### Initial knowledge types

- fact
- principle
- decision
- strategy
- goal
- policy
- process
- preference
- insight
- idea
- opportunity
- risk
- assumption
- open_question
- learning
- content_idea
- architecture_decision
- ux_principle
- roadmap_item
- integration_decision

Types should remain extensible. Do not encode every business vertical into the base table.

## Lifecycle and authority

Knowledge must have lifecycle rather than becoming permanent truth by accident.

PROPOSED → APPROVED → SUPERSEDED → ARCHIVED

Optional REJECTED may be retained for review/audit history but should not be returned as active knowledge.

Retrieval defaults to current APPROVED knowledge. PROPOSED knowledge may be visible in review/inbox experiences but must not silently become organisational truth.

When newer approved knowledge conflicts with older approved knowledge, DigitalGate should surface the conflict and support explicit supersession rather than quietly choosing one.

## Relationships

Knowledge must be linkable to canonical Platform Core objects without duplicating them. Relationships may target:

- organisation
- contact
- company
- opportunity
- task
- activity
- document
- website
- booking
- payment
- project
- app
- integration
- objective
- feature/capability
- another knowledge item

Principle: one business concept → one canonical object → one canonical primary UI. Business Brain knowledge augments canonical objects; it does not create parallel CRMs, customer records or document stores.

## Documents boundary

`org_documents` remains the canonical document/storage object. Business Brain Knowledge must not overload it.

A document may be a Knowledge Source. Knowledge extracted from that document becomes structured Knowledge Items that reference the document/source and can be superseded independently.

Example:

`COMMAND-CENTRE.md` (document/source) → "Command Centre is the DigitalGate operator control plane" (approved architecture decision)

## Knowledge Inbox

The primary user workflow should be simple:

> DigitalGate found 12 things worth remembering.
> 3 decisions · 4 principles · 2 opportunities · 2 actions · 1 content idea
> Review knowledge →

The user can approve, edit, reject, merge or mark an item as already known.

Default behaviour should minimise configuration. Extraction should happen automatically for authorised sources where practical, while approval remains clear for material organisational knowledge.

## Contradiction detection

Business Brain should detect likely conflicts such as:

- a newer architecture decision contradicting an older platform document
- a current pricing decision conflicting with obsolete pricing collateral
- an updated workflow replacing an old process
- a customer preference changing over time

Conflict handling should show both sources, recency, authority and proposed resolution.

## Retrieval rules

Business Brain / Advisor should prefer:

1. organisation scope match
2. APPROVED status
3. current/non-superseded items
4. direct object/app/project relevance
5. authority and importance
6. recency where the knowledge is time-sensitive
7. source confidence/provenance

The Brain should be able to answer "why do you believe this?" by tracing retrieved knowledge to its source.

## Security and tenancy

All source and knowledge access is organisation-scoped unless explicitly platform-operator scoped. Server-side authorisation is mandatory; navigation hiding is not authorisation.

DigitalGate operator knowledge and customer organisation knowledge are distinct scopes. Command Centre may inspect tenant knowledge only through authorised operator workflows with auditability.

Consequential knowledge actions should produce audit records, particularly approval, supersession, deletion/archive, bulk import and operator actions.

## Platform integration

Business Brain Knowledge should become a Platform Core capability consumed by:

- Business Brain
- AI Advisor
- Automation
- Analytics/Business Health
- Growth apps
- Industry apps
- AI Communications
- Search/command
- Notifications/recommendations

The implementation should emit shared events for material changes, e.g.:

- knowledge.proposed
- knowledge.approved
- knowledge.superseded
- knowledge.archived
- knowledge.conflict_detected

## Historical conversation backfill

DigitalGate is the first dogfood organisation.

Historical backfill should be extraction-based, not transcript-dump based:

1. identify available prior DigitalGate conversations and canonical docs
2. extract durable candidate items
3. deduplicate against existing knowledge
4. detect contradictions
5. group by type and scope
6. review/approve candidates
7. import approved items with provenance

The initial seed in `docs/business-brain/digitalgate-knowledge-seed.json` captures durable decisions recoverable from current project context. It is intentionally not represented as a complete archive of every historical ChatGPT message: only source material actually available to the importer may be claimed as captured.

## Definition of Done — V1

V1 is complete when:

- knowledge is first-class and organisation-scoped
- source/provenance is retained
- lifecycle and supersession work
- review/inbox workflow exists
- CRUD is permissioned server-side
- tenant isolation tests exist
- Business Brain/Advisor can retrieve approved current items
- canonical Documents remain separate
- contradictions can at least be flagged for review
- DigitalGate seed/backfill can be imported idempotently
- consequential actions are auditable
- no WordPress dependency exists in normal runtime
- responsive/loading/empty/error states meet platform standards
- the Business Owner Simplicity Gate passes

## Later phases

Later phases may add semantic embeddings/vector retrieval, automatic meeting/chat ingestion, richer knowledge graph relationships, temporal reasoning, confidence calibration and closed-loop learning. These are enhancements to the governed knowledge model, not substitutes for it.

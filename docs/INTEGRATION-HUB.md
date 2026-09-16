# DigitalGate Integration Hub

Status: Core Gen 2 product programme  
Owner: Platform Core / Connector Engine / Business Brain

## Product proposition

> **Connect your business. Don't rebuild it.**

DigitalGate should become the intelligence, automation and operating layer across the systems a business already uses. Adoption must not require a customer to replace every specialist platform on day one.

When a prospect says, “I already use four different platforms”, the DigitalGate answer is integration rather than forced rip-and-replace: connect useful systems, unify authorised context and workflows, identify manual gaps, then consolidate redundant systems where doing so creates genuine value.

This extends the existing strategic principle: **Connect what already works. Build what makes DigitalGate unique. Intelligence ties everything together.**

## Objectives

1. Make DigitalGate visibly compatible with a broad business software ecosystem.
2. Support major services and platforms across multiple industries.
3. Make connection simple enough for a normal business owner during onboarding.
4. Turn connected systems into better Business Brain context, recommendations and automation.
5. Preserve strict organisation and resource isolation in every multi-tenant connector.
6. Represent integration capability honestly; a catalogue logo must never imply functionality that does not exist.
7. Allow specialist software to remain in place where replacement would add cost without strategic advantage.

## Product layers

```text
Connector Engine
      ↓
Integration Catalogue / Hub
      ↓
Connected Services
      ↓
Onboarding discovery and recommendations
      ↓
Canonical Platform Core objects + authorised external evidence
      ↓
Business Brain / Advisor / Automation / Analytics / Industry Apps
```

### Connector Engine

The shared technical foundation owns authentication, OAuth state, token refresh, API keys, webhooks, polling/sync, rate limits, connection health, resource discovery, organisation assignment, provenance and provider-specific adapters.

### Integration Catalogue / Hub

The customer-visible catalogue should be searchable by provider, category, capability and industry. It may contain a large ecosystem, but every entry must expose an honest capability state.

Recommended states/methods include:

- Native
- API
- OAuth
- Webhook
- Automation bridge
- Import/export
- Universal connector
- Available to configure
- Planned

`Planned` integrations must never render as though they are operational.

### Connected Services

Connected Services is the normal customer management surface. Customers should see plain-language states such as Connected, Action required, Available and Not connected. Provider diagnostics, environment variables, redirect URIs and platform credentials remain operator concerns unless an advanced customer workflow genuinely requires them.

### Onboarding

Onboarding should ask what systems the business already uses and recommend relevant connections based on the organisation's industry, sub-industry, operating profile and selected services.

The connection step must be skippable. A failed or optional connector must not trap onboarding.

Example flow:

1. DigitalGate understands the business and industry.
2. “What does your business already use?” — searchable service selection.
3. DigitalGate recommends relevant connections.
4. Customer authorises a provider once.
5. DigitalGate discovers available resources/accounts/pages/properties.
6. Customer assigns only the resources belonging to this organisation.
7. DigitalGate explains what useful context each connection unlocks.
8. Aida completes setup using authorised evidence only.

## Organisation and resource isolation

The Google Business Profile implementation establishes the required pattern for multi-resource providers:

> **External identity/account is not organisation assignment.**

A user may authorise an external identity that has access to several businesses. DigitalGate must discover those resources and require explicit organisation-scoped assignment where ambiguity exists.

Only assigned resources may feed that organisation's Business Brain, Advisor, Analytics, Reputation, Automation or Industry Apps.

This pattern applies to providers such as Google, Microsoft, Meta, LinkedIn, accounting systems, property systems and any provider where one login can access multiple businesses, pages, properties, workspaces or accounts.

## Universal connectivity

DigitalGate should not require a bespoke native adapter before every external system can participate. The Integration Hub should progressively support universal connection methods including:

- REST APIs
- webhooks
- secure API keys
- OAuth where supported
- email ingestion
- CSV/import-export
- SFTP/file exchange where justified
- database/data-warehouse connections where justified
- automation bridges such as Zapier, Make or n8n

Universal connectivity is a bridge, not permission to overstate native support.

## Ecosystem scope

The catalogue should progressively cover major providers in:

- Google and Microsoft productivity/business services
- social media and advertising
- CRM and sales
- accounting and finance
- payments and commerce
- marketing and email
- communications and collaboration
- websites and e-commerce
- automation platforms
- analytics and BI
- customer service
- productivity/project management
- real estate and property
- mortgage and financial services
- conveyancing and legal
- accommodation, tourism and channel management
- other Industry App ecosystems as DigitalGate expands

Industry-specific systems should be surfaced contextually rather than cluttering every customer's default experience.

## Business Brain relationship

Connections are not valuable merely because data can be imported. More connected context must make DigitalGate meaningfully more useful.

Authorised connector evidence should improve:

- business understanding
- opportunity detection
- AI Advisor recommendations
- Business Health and analytics
- automation triggers/actions
- customer and operational context
- Industry App workflows
- cross-system reporting
- identification of duplicated tools and manual work

The Business Brain must preserve provenance and distinguish canonical Platform Core data from supplementary external evidence.

## Commercial positioning

DigitalGate should not normally lead with “replace your software stack”. The stronger proposition is:

> DigitalGate connects the systems you already use and gives you one intelligent operating layer across the business. We can then identify which systems are worth keeping, what can be automated and where unnecessary software or manual work can be consolidated.

This reduces switching friction and turns an existing multi-platform environment from an objection into an integration opportunity.

Specialist systems — for example property, finance, conveyancing/legal or accommodation platforms — may remain the specialist system of record for their domain while DigitalGate provides cross-business intelligence, CRM, marketing, communications, automation, analytics and orchestration around them.

## Initial programme sequence

1. Stabilise existing connector reliability, beginning with current LinkedIn and Google-family journeys.
2. Harden the shared Connector Engine patterns.
3. Build the Integration Catalogue / Hub foundation.
4. Upgrade customer Connected Services UX.
5. Add onboarding service discovery and recommended connections.
6. Add industry-aware connector recommendations.
7. Expand native and universal connectors according to customer demand and strategic value.
8. Surface integration breadth appropriately in DigitalGate sales/website material once capability states are truthful.

## Definition of Done

An Integration Hub release is not complete because provider logos exist. V1 requires:

- searchable catalogue with truthful capability states
- clear separation between customer Connected Services and operator diagnostics
- organisation-scoped connection records
- resource assignment for ambiguous multi-resource providers
- server-side tenant isolation
- health/re-authorisation states
- onboarding discovery that is optional and non-blocking
- industry-aware recommendations
- Business Brain provenance for connector-derived evidence
- at least one documented universal connection path
- responsive/loading/empty/error states
- end-to-end verification for every connector labelled operational
- no unsupported integration presented as connected/native

## Related

- `docs/foundations/BUSINESS-BRAIN-KNOWLEDGE.md`
- `docs/BUSINESS-OVERVIEW.md`
- `docs/PLATFORM-ARCHITECTURE.md`
- `.cursor/rules/connector-scope.mdc`

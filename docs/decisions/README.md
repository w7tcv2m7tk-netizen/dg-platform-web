# Architecture decisions

Significant platform decisions are recorded as **Architecture Decision Records (ADRs)**.

**Canonical location:** [`docs/adr/`](../adr/README.md)

This `docs/decisions/` path is the **stable alias** used by the Platform Knowledge Layer / docs SSOT tree (`…/decisions/`). Prefer linking `docs/adr/` in PRs; both resolve to the same practice.

## Index

See the full table in [adr/README.md](../adr/README.md).

Recent Platform Intelligence–related decisions:

| ADR | Title |
|-----|-------|
| [0010](../adr/0010-opportunity-engine-remains-core.md) | Opportunity Engine™ remains Platform Core |
| [0011](../adr/0011-reputation-core-plumbing-growth-app.md) | Reputation = Core plumbing + Growth App |
| [0012](../adr/0012-gen-2-architecture-brief-adopted.md) | Gen 2 Architecture Brief = north-star constraints |
| [0013](../adr/0013-gtm-rollout-strategy-adopted.md) | GTM / rollout strategy = canonical product–marketing lock |

North-star brief: [architecture/GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md).

## Creating a new ADR

Follow [adr/README.md](../adr/README.md) — copy `0000-template.md`, fill Status / Context / Decision / Consequences, add to the ADR index.

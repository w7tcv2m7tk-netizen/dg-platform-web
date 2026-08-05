# Architecture Decision Records (ADR)

Records of significant architectural decisions — **why** we chose a path.

## Format

Each ADR follows [Michael Nygard's template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions):

- **Status:** Proposed | Accepted | Deprecated | Superseded  
- **Context** — forces at play  
- **Decision** — what we chose  
- **Consequences** — trade-offs  

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-generation-2-nextjs-platform.md) | Generation 2 as Next.js multi-tenant SaaS | Accepted |
| [0002](./0002-wordpress-as-connector.md) | WordPress as Connector, not foundation | Accepted |
| [0003](./0003-universal-objects.md) | Universal Objects — no duplicate models | Accepted |
| [0004](./0004-event-driven-architecture.md) | Event-driven integration between features | Accepted |
| [0005](./0005-clerk-authentication.md) | Clerk for authentication (Gen 2) | Accepted |
| [0006](./0006-digital-twin-concept.md) | Digital Twin™ as org digital state | Accepted |
| [0007](./0007-feature-registry-permissions.md) | Feature-based permissions and licensing | Accepted |

## Creating a new ADR

1. Copy `0000-template.md` → `00NN-short-title.md`  
2. Fill in context, decision, consequences  
3. Add to index above  
4. Link from PR if decision triggered by implementation  

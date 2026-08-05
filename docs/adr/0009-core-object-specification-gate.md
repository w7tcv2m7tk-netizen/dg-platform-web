# ADR 0009: Core Object Specification as implementation gate

**Status:** Accepted  
**Date:** August 2026  
**Deciders:** Founder & Platform Architect

---

## Context

Platform architecture is ~80% complete (vision, App model, Twin, Command Centre, connectors spec). The remaining 20% — governance, scalability, commercialisation — centres on **canonical domain objects**. Changing Contact, Lead, or Organisation definitions after Postgres is live with production data is expensive.

Implementation was paused to define foundations across twelve areas, with **Core Object Specification** as the highest priority artifact.

---

## Decision

1. Adopt [CORE-OBJECT-SPECIFICATION.md](../foundations/CORE-OBJECT-SPECIFICATION.md) as the **authoritative contract** for Universal Objects.  
2. **No production Postgres deployment** until Founder reviews and accepts the spec (or documents explicit changes).  
3. Prisma schema must align to Platform 1.0 scope in the spec before `db:push` to production.  
4. Changes to mandatory fields or ownership after Platform 1.0 ship require ADR + migration plan.  
5. Twelve foundation documents govern releases, marketplace, i18n, white-label, data, CS, education, observability, commercial model, AI governance, and network intelligence.

---

## Consequences

**Positive:**

- One source of truth for objects, events, and schema phasing  
- Apps and Connectors integrate against stable definitions  
- Commercial and intelligence layers have clear data foundations  

**Negative:**

- Short delay before coding Postgres/API — intentional  
- Spec maintenance overhead — offset by reduced rework  

---

## References

- [foundations/README.md](../foundations/README.md)  
- [catalogues/OBJECT-MODEL.md](../catalogues/OBJECT-MODEL.md)

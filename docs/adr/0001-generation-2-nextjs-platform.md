# ADR 0001 — Generation 2 as Next.js Multi-Tenant SaaS

**Status:** Accepted  
**Date:** August 2026  

## Context

DigitalGate Version 1 is a WordPress plugin deployed per client site (~50k LOC, production on Roe, CVH, digitalgate.com.au). The long-term vision requires true multi-tenancy, modular Apps, API-first design, and independence from any single CMS.

## Decision

Build **Generation 2** as a standalone **Next.js multi-tenant SaaS** at `app.digitalgate.com.au`. Gen 1 is preserved as production IP and migrates to a **Connector** — not discarded.

## Consequences

**Positive:** Single codebase, org isolation, modern auth, path to HubSpot-class platform.  
**Negative:** Dual-track maintenance during migration; Gen 1 must stay stable for paying clients.  
**Neutral:** `dg-platform-web` repo evolves into monorepo (`packages/platform-core`, `packages/ui`, …).

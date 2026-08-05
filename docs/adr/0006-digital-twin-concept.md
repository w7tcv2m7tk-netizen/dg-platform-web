# ADR 0006 — Digital Twin™ Concept

**Status:** Accepted  
**Date:** August 2026  

## Context

Dashboards that show isolated CRM metrics don't answer: *"What should I focus on today?"* Businesses need a unified view of their entire digital state.

## Decision

Every Organisation has a **Digital Twin™** — continuously updated representation of complete digital state (brand, web, SEO, AI Visibility, CRM, pipeline, reviews, connectors, …). Scores, BI insights, and AI context are generated **from the Twin**, not siloed apps.

## Consequences

**Positive:** Differentiated BI; richer AI; aligns with Gateway brand narrative.  
**Negative:** Requires graph + connector data to be meaningful; build incrementally.  
**Neutral:** Types in `packages/platform-core/src/twin/`; snapshot service Phase 2.

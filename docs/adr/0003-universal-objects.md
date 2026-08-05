# ADR 0003 — Universal Objects

**Status:** Accepted  
**Date:** August 2026  

## Context

Gen 1 grew industry-specific tables and parallel contact models per module. This creates duplication, breaks universal search/timeline, and complicates AI context.

## Decision

Formal **Universal Objects** (Contact, Company, Lead, Property, Activity, …). Industry Apps **extend** objects — they do not create parallel entities. Relationships modelled in the **Knowledge Graph**.

## Consequences

**Positive:** One timeline, one search, richer AI, cleaner migrations from Gen 1.  
**Negative:** Upfront schema discipline; apps must register entities in manifest.  
**Neutral:** Prisma schema in `packages/database/` is source of truth for Gen 2 persistence.

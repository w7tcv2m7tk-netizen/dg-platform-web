# ADR 0004 — Event-Driven Architecture

**Status:** Accepted  
**Date:** August 2026  

## Context

Tight coupling between modules in Gen 1 (direct PHP calls) makes automation, notifications, and Connectors fragile.

## Decision

Every significant business action **publishes a domain event**. Features respond via **Event Bus** — they do not call each other directly. Start in-process; migrate to durable queue when scale requires.

## Consequences

**Positive:** Automation, BI, Connectors, and AI subscribe without coupling.  
**Negative:** Event catalogue must be maintained; ordering/idempotency needed at scale.  
**Neutral:** Implementation technology (Inngest, BullMQ, SQS) is developer choice.

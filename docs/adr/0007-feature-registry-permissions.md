# ADR 0007 — Feature Registry for Permissions

**Status:** Accepted  
**Date:** August 2026  

## Context

App-level permissions (`crm.view_contacts`) are too coarse for licensing, roles, and enterprise customers.

## Decision

Introduce **Feature Registry** beneath Apps — granular IDs like `crm.contacts.read`, `crm.contacts.export`. App manifests declare `features: string[]`. Billing and RBAC reference feature IDs.

## Consequences

**Positive:** Granular licensing; clearer entitlement checks; partner-ready SDK.  
**Negative:** More IDs to maintain; registry must stay in sync with manifests.  
**Neutral:** Scaffold in `packages/platform-core/src/features/`.

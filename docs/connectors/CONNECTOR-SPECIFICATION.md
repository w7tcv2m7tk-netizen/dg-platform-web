# Connector Specification

**Canonical architecture:** [../foundations/CONNECTOR-ENGINE.md](../foundations/CONNECTOR-ENGINE.md)

This page is the short operational summary. Design decisions, tiers, Listing Hub, and implementation priority live in **Connector Engine**.

---

## Contract (summary)

Connectors are **not** the platform. They sync via **Platform API** into Universal Objects.

Every connector must cover: identity, auth, sync modes, object mapping, health, events — plus credentials, webhooks, logs, rate limits, permissions, disconnect/reconnect, manual sync, and data ownership (full table in Connector Engine).

---

## Live today

| Connector | Notes |
|-----------|--------|
| **WordPress** | Gen 1 plugin → Gen 2 slim connector; leads, properties, Acc stays |
| **Stripe** | Platform billing + Commerce Payment Engine |

Code: `packages/platform-core/src/connectors/wordpress/`, `commerce/connectors/stripe/`, `connectors/framework/`.

---

## Priority queue

See Connector Engine § Implementation priority: Stripe → Google → WordPress → REA → Domain → Meta → Email/SMS → Xero → Shopify → property intelligence.

REA / Domain = **start of the ecosystem**, not the centre. Listing Hub: [PROPERTY-SYNDICATION.md](../foundations/PROPERTY-SYNDICATION.md).

---

## Rules

1. Connectors call **Platform API only** — no direct DB  
2. Idempotent sync (external ID on object / placement)  
3. Failures retried with backoff; dead-letter at scale  
4. Credentials encrypted per org  
5. Prefer webhooks over polling  
6. Country Pack / `countries[]` on manifests where relevant  

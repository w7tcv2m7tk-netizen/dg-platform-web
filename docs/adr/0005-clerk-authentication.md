# ADR 0005 — Clerk for Authentication

**Status:** Accepted  
**Date:** August 2026  

## Context

Gen 2 needs production auth quickly — sign-up, sign-in, password reset, session management — without building auth from scratch.

## Decision

Use **Clerk** for Generation 2 authentication. Production domain: `app.digitalgate.com.au` with custom Clerk DNS on `digitalgate.com.au`.

## Consequences

**Positive:** Live in weeks; SSO path; org provisioning via webhooks.  
**Negative:** Vendor dependency; live keys and DNS setup required.  
**Neutral:** Platform maps Clerk users → Organisation memberships in Postgres.

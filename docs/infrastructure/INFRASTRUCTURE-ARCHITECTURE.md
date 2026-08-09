# Infrastructure Architecture

**Core Platform Service — points to foundations doc**

**Version:** 0.2  
**Last updated:** August 2026  

> **Canonical:** [foundations/INFRASTRUCTURE.md](../foundations/INFRASTRUCTURE.md) · Email: [foundations/EMAIL-INFRASTRUCTURE.md](../foundations/EMAIL-INFRASTRUCTURE.md)

Infrastructure is **not** an industry App. Customer sees DigitalGate Domains/Hosting/Email/DNS/SSL. **Dreamscape** is the V1 provider adapter for domains/DNS/mailbox (keep it). **Resend** is V1 transactional send. Sandbox-first; credentials server-side only.

**Code:** `packages/platform-core/src/infrastructure/`  
**API:** Domains availability + `GET /api/v1/infrastructure/email`  
**UI:** `/apps/infrastructure/domains`, `/apps/infrastructure/email`
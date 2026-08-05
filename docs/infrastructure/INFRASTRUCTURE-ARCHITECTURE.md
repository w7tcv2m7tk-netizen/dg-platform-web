# Infrastructure Architecture

**Domains, hosting, DNS, SSL, and deployments — orchestration over providers**

**Version:** 0.1  
**Last updated:** August 2026  
**Status:** Design — manifest registered; implementation Phase 2+

**Related:** [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) · [websites/WEBSITES-ARCHITECTURE.md](../websites/WEBSITES-ARCHITECTURE.md)

---

## Strategic intent

Businesses expect to manage domains, DNS, SSL, and hosting as part of their digital presence. DigitalGate provides the **management layer** — integrate registrar and hosting APIs first; become a reseller later if volume justifies it.

**Principle:** Own UX and provisioning workflows. Providers own raw infrastructure.

---

## Modules

```
Infrastructure App
├── Domains       ← search, register, transfer, renew
├── DNS           ← records, subdomains, redirects, email auth
├── SSL           ← provision, expiry monitoring
├── Hosting       ← Next.js, WordPress, static, staging
├── CDN           ← edge cache
├── Backups       ← schedule, restore
├── Monitoring    ← uptime, alerts
├── Security      ← headers, WAF (via CDN)
└── Deployments   ← preview, promote, rollback
```

---

## Provider abstraction (planned)

```typescript
interface DomainRegistrar {
  searchAvailability(domain: string): Promise<DomainSearchResult>;
  registerDomain(params: RegisterDomainParams): Promise<DomainRef>;
}

interface HostingProvider {
  createProject(params: CreateProjectParams): Promise<ProjectRef>;
  deploy(ref: ProjectRef, source: DeploySource): Promise<DeploymentRef>;
}

interface DnsProvider {
  listRecords(zoneId: string): Promise<DnsRecord[]>;
  upsertRecord(zoneId: string, record: DnsRecord): Promise<void>;
}
```

v1 providers: registrar API (Namecheap/Porkbun/Cloudflare), Vercel for Next.js, Cloudflare for DNS/CDN.

---

## Websites App integration

```
AI Website Studio → staging deploy → user approves
     → attach domain + SSL → DNS → production deploy
     → Health Centre monitoring starts
```

---

## Connector vs Infrastructure

| Task | Layer |
|------|-------|
| Sync existing WordPress content | Connector |
| Register domain for new customer | Infrastructure App |
| Monitor Roe WP SSL expiry | Infrastructure + Health Centre |

---

## Build phases

| Phase | Scope |
|-------|-------|
| 0 | Manifest + docs ✅ |
| 1 | Domain connect read-only |
| 2 | DNS read-only |
| 3 | SSL expiry alerts |
| 4 | Domain search + register |
| 5 | DNS edit with audit |
| 6 | Next.js hosting (Vercel per org) |
| 7 | Deployments UI + rollback |

---

## Events (planned)

`domain.registered` · `domain.expiring_soon` · `dns.record_changed` · `ssl.expiring_soon` · `deploy.succeeded` · `uptime.incident`

---

## Rules

1. Provider keys org-scoped — never in client bundles  
2. DNS/domain changes audited + emit events  
3. No auto-deploy to production without explicit promote  
4. SSL/uptime feeds Website Health Centre  

**Manifest:** `packages/platform-core/src/apps/builtins/infrastructure.ts`

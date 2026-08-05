# Platform Releases

**Version the platform by outcomes — not just code semver**

DigitalGate ships as **Platform Releases**. App manifests have their own semver; the platform has release milestones that align product, sales, and engineering.

---

## Release model

```
Platform Release (e.g. 1.0 Foundation)
  ├── Platform Core capabilities
  ├── Included Apps (versions pinned)
  ├── Connector set
  └── Exit criteria (measurable outcomes)
```

**Code versioning:** `dg-platform-web` uses git + deploy tags. **Product versioning:** communicate Platform Release to customers and team.

---

## Release roadmap

| Release | Codename | Theme | Target | Exit criteria |
|---------|----------|-------|--------|---------------|
| **1.0** | Foundation | System of record | Q3–Q4 2026 | Signup → org in Postgres → CRM contacts + timeline without wp-admin |
| **1.5** | Intelligence | AI + scores + RE | Q1 2027 | Roe vendor workflow on Gen 2; Business Health + AI Visibility on dashboard |
| **2.0** | Multi-industry | Accommodation + Finance scaffold | Q2–Q3 2027 | CVH bookings live; second industry App proven |
| **3.0** | Marketplace | Third-party Apps + SDK | 2028 | External developer publishes App; revenue share live |

Patch releases (`1.0.1`) = bug fixes, security, non-breaking schema additions.  
Minor platform notes (`1.1`) = new Core features within same theme.

---

## Platform 1.0 — Foundation (current focus)

**Scope lock — nothing outside this until exit criteria met:**

| In scope | Out of scope |
|----------|--------------|
| Postgres multi-tenant | AI Visibility production |
| Org provisioning (Clerk webhook) | Accommodation App |
| Contact, Company, Activity, Task, Lead | Marketplace |
| CRM App (list, create, timeline) | White-label enabled |
| App Registry + Feature Registry | Full Command Centre UI |
| Event bus (in-process) | Durable queue |
| Audit logs (writes) | Cross-tenant benchmarking |
| WP bridge (`/portal/me`) | WordPress Connector v1 |

**Exit criteria:** Roe can add a contact in Gen 2 and see it on timeline — data in Postgres, not WP.

---

## Platform 1.5 — Intelligence

| Deliverable | Outcome |
|-------------|---------|
| Real Estate App v0 | Vendor leads + pipeline |
| Scoring Engine v1 | Business Health, AI Visibility, Success Score |
| Digital Twin v1 | Per-org snapshot |
| BI Engine v1 | Recommended actions on dashboard |
| AI Service v1 | Summaries, Growth Report draft |
| WordPress Connector v1 | Leads sync to Platform |
| Stripe billing | Subscriptions tied to org |
| Command Centre v0 | Platform Overview + Client Intelligence |

**Exit criteria:** Wow moment — connect systems → scores + opportunities within minutes.

---

## Platform 2.0 — Multi-industry

| Deliverable | Outcome |
|-------------|---------|
| Accommodation App | CVH bookings on Gen 2 |
| Opportunity + Property in production | Full RE pipeline |
| Global readiness (locale, currency fields) | Schema supports AU + NZ |
| Command Centre v1 | Growth Reports, AI Advisor, rankings |
| DigitalGate Intelligence v0 | Cohort benchmarks (min N tenants) |

---

## Platform 3.0 — Marketplace

| Deliverable | Outcome |
|-------------|---------|
| App SDK + manifest validation | Third-party Apps |
| Marketplace listing + install flow | Customer self-serve App install |
| Revenue share / partner billing | Commercial model live |
| Enterprise tier | SSO, custom SLA, dedicated support |

---

## Release governance

| Activity | Owner | When |
|----------|-------|------|
| Scope lock | Founder / Product | Start of release |
| Exit criteria review | Engineering + Product | End of release |
| Customer communication | Marketing | Commercial launch only |
| Deprecation notices | Product | 90 days before removal |

**Rule:** No scope creep into next release without explicit scope lock change (ADR or release note).

---

## Compatibility

| Layer | Policy |
|-------|--------|
| Platform API | `/v1` stable within major release; breaking → `/v2` |
| App manifests | Apps declare `minPlatformVersion` |
| Connectors | Declare supported API version |
| Database | Expand-only migrations within release; destructive → new release |

---

## Related

- [ROADMAP.md](../ROADMAP.md) — execution workstreams  
- [APP-MARKETPLACE.md](./APP-MARKETPLACE.md) — App versioning  
- [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) — schema per release  

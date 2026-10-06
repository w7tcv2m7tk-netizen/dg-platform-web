# SEO Engine & AI Visibility — shared presence audits

**Status:** Historical presence slice baseline (Aug 2026); later exact-observation execution remains a separate evidence contract
**Apps:** `seo` · `ai-visibility`  
**Related:** [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) · Growth Engine presence audit · Website Builder Studio SEO

---

## Principle

SEO Engine and AI Visibility share **one source of truth**: the organisation SEO/presence audit (`runOrgSeoAudit` → `runPresenceAudit`), persisted as Activity `seo.audit_completed`.

Scores reflect **observable HTML** (and optional Studio native checks). They do **not** invent:

* ChatGPT / Gemini / Perplexity / Copilot citation ranks  
* Keyword SERP positions  
* Decorative demo scores (no hardcoded 72 / 92)

> The industry is configuration; the operating system remains the same.  
> For visibility: the probe is shared; the product surface differs.

---

## Shared flow

```
Business Profile website URL
        │
        ▼
POST /api/v1/seo/audit  (runOrgSeoAudit)
        │
        ├─ Live HTML presence probe
        └─ Optional Studio native SEO/health blend
        │
        ▼
Activity (seo.audit_completed)
  scores.seo · scores.aiVisibility · scores.websiteHealth
  probes · findings
        │
        ├─ /apps/seo          (Overview + Audit UI)
        ├─ /apps/ai-visibility (Dashboard hero + signals)
        └─ Digital Twin        (prefers fresh audit ≤ 30 days)
```

---

## Presence-slice honesty constraints (historical scope)

| Claim | MVP reality |
|-------|-------------|
| AI Visibility Score™ | From last presence audit (schema / OG / technical) |
| SEO Score | Blended public probe + Studio checks when a native site exists |
| “Monitoring ChatGPT” | **Out of scope** for this slice |
| No website URL | Show critical path → Business Profile; score absent / not decorative |

---

## Key modules

| Path | Role |
|------|------|
| `packages/platform-core/src/seo/index.ts` | `runOrgSeoAudit`, `scoresFromLatestSeoAudit`, helpers |
| `.../command-centre/growth-engine/presence-audit.ts` | Live URL fetch + HTML signals |
| `src/components/seo/WebsiteSignalsPanel.tsx` | Shared evidence checklist |
| `src/app/api/v1/seo/audit/route.ts` | GET history / POST run |

---

## AI Reputation & Evidence — approved roadmap direction

The presence audit above measures observable website/technical evidence; it must not stand in for actual model/search observations. Preserve the current AI Visibility exact-observation execution semantics: exact provider/model identity, no substitution or escalation, and no added grounding that changes what is being observed. Record failures and unavailable observations honestly. An HTML presence score is not a model citation rank.

Future evolution should measure how major AI/search systems understand, cite, mention and recommend a business; associations with locations/services/topics; supporting web/entity/reputation evidence; appropriately sourced competitor comparisons; and change over time. Keep model observations distinct from supporting evidence and DigitalGate interpretations. Preserve source, observation time, query/context, model/provider identity and freshness so comparisons do not conceal different measurement conditions.

This direction feeds the shared [Evidence & Provenance Graph](./BUSINESS-BRAIN-KNOWLEDGE.md#evidence--provenance-graph-approved-long-term-direction) and [roadmap](../ROADMAP.md#ai-visibility--ai-reputation--evidence-future). It does not migrate AI Visibility into the Gateway or alter production implementation. Future SEO/customer-facing generated content follows [AI Content Governance](./AI-GOVERNANCE.md#ai-content-governance-future), with drafting and publication authority kept separate.

---

## Still next

* Multi-page crawl / sitemap depth  
* Core Web Vitals / PageSpeed  
* Keyword rankings  
* Broader model citation/reputation monitoring beyond current exact observations
* Automation hooks (`seo.score_dropped`, citation events)

**GTM:** Public free AI Visibility audits (rollout Phase 4) must keep these honesty constraints — [DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md).

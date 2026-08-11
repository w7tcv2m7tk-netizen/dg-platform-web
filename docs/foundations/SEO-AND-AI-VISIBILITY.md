# SEO Engine & AI Visibility — shared presence audits

**Status:** Honest presence slice shipped (Aug 2026)  
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

## Honesty constraints

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

## Still next

* Multi-page crawl / sitemap depth  
* Core Web Vitals / PageSpeed  
* Keyword rankings  
* Live LLM citation monitoring (true “AI Visibility Pro” depth)  
* Automation hooks (`seo.score_dropped`, citation events)

**GTM:** Public free AI Visibility audits (rollout Phase 4) must keep these honesty constraints — [DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md).

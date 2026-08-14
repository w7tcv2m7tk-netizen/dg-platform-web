# Advisor Evidence — Stage 1: Product Reality

**Purpose:** Outside assessment of whether DigitalGate **feels commercially compelling and intelligent to a first customer** — not another architecture review.  
**Date:** 14 August 2026  
**Status:** Marketing surfaces **live and re-checked** · Product evidence **blocked on Ben captures** · **No Stage 2 until Stage 1 complete**  
**Canon:** [INTELLIGENT-LAYER.md](../foundations/INTELLIGENT-LAYER.md) · [BUSINESS-ADVISOR-BRIEFING.md](./BUSINESS-ADVISOR-BRIEFING.md) · [COMMERCIALLY-READY-V1.md](../foundations/COMMERCIALLY-READY-V1.md)

**Advisor question (locked):**  
Does DigitalGate now feel like an **intelligent business operating platform in practice**, rather than a collection of capable apps?

**After advisor returns:** Triage into P0 / P1 / P2 / P3 before any new build. Milestone = **Founding 10 operate successfully** — not “better DigitalGate.”

---

## Live URLs (re-check complete — 14 Aug 2026)

| Surface | URL | Status |
|---------|-----|--------|
| Homepage | https://digitalgate.com.au/ | ✅ Live — Founding strip “operate” language confirmed |
| Pricing | https://digitalgate.com.au/pricing/ | ✅ Live — property Industry Apps grouped; Services = **Coming** |
| Founding Customer | https://digitalgate.com.au/founding-customers/ | ✅ Live — commercial advantage framing (not beta / help-shape) |
| Gen 2 app | https://app.digitalgate.com.au | ✅ Live — walkthrough pending |
| Onboarding | https://digitalgate.com.au/onboarding/ | Link |

**Marketing:** leave as-is for Stage 1 advisor review. Do not chase more site polish before product evidence.

---

## Remaining Stage 1 evidence (Ben → then pack complete)

### 1. Logged-in customer walkthrough (highest priority)

**Format:** Loom / screen recording **or** ordered screenshot pack. Not a polished sales demo — real product as a new customer sees it.

**Start in customer shell — not `/command`.**

| # | Step | Path |
|---|------|------|
| 1 | Signup / onboarding | `/signup/account` → `/onboarding` |
| 2 | Business | `/dashboard/business` |
| 3 | Overview | `/dashboard` |
| 4 | Digital Twin (whatever exists as Twin / health / overview twin) | Overview / Business surfaces |
| 5 | CRM | `/apps/crm` |
| 6 | Contact | `/apps/crm/contacts` → one contact |
| 7 | Opportunity | `/apps/crm/opportunities` → one opp |
| 8 | Task | `/apps/crm/tasks` |
| 9 | Real Estate | `/apps/re` (+ one lead/property if available) |
| 10 | AI Visibility | `/apps/ai-visibility` |
| 11 | SEO | `/apps/seo` |
| 12 | Automation | `/apps/automation` |
| 13 | Apps & Billing | `/dashboard/apps` |
| 14 | Support | `/support` |

**Advisor must be able to answer:**  
*If I were a paying customer, does this feel like DigitalGate understands my business?*

Optional appendix (label clearly as staff): `/command` — after customer path only.

---

### 2. Roe vendor-lead workflow recording

**Org:** Roe Realty (customer experience).  
**Show what actually happens — not what should happen.**

```
Lead arrives
  → Contact created/updated
  → Opportunity
  → Task
  → Automation (if any)
  → Follow-up
  → Pipeline progression
```

This is the commercial wedge proof. Prefer a real lead path over a staged fake if data exists.

---

### 3. Export 10–20 live Opportunities

From `/apps/opportunities` (customer) and/or staff `/command/opportunities` — prefer **customer-visible** where possible; label staff-only clearly.

Capture per row (CSV/JSON/screenshots OK):

| Field | Needed |
|-------|--------|
| Title | ✅ |
| Kind / type | ✅ |
| Score | ✅ |
| Severity / priority | ✅ |
| Reasons | ✅ |
| Recommended action | ✅ |
| Impact label (if any) | ✅ |
| Click destination (href) | ✅ |
| What happens after click | Note in capture |
| Outcome recorded? | Yes / No / Unknown |

**Advisor bar:** Does the engine identify something valuable the owner would otherwise have missed — with sensible prioritisation and a path to act?

---

## Marketing snapshot (for advisor — already live)

### Founding
Operate framing live. Still may over-explain platform mid-page; form still lists Apps interest. Pressure-test: founding **outcome** vs platform lecture.

### Pricing + Founding together
OS narrative + **$99 / $249 / $499 + Apps**. Industry order live: RE → Acc → PM → Commercial Property → Property Development → Services (Coming) → …  
Pressure-test: intelligent OS vs inexpensive module menu.

### Homepage
BOP / Twin / Founding CTA. Apps hierarchy still prominent. Decide/Learn not on marketing pillars. RE weekly outcome story still weak vs horizontal OS copy.

---

## Explicit holds

| Do now | Do **not** do yet |
|--------|-------------------|
| Collect walkthrough + Roe + Opportunities | Stage 2 repo / Prisma / platform-core dump |
| Complete this Stage 1 pack when uploads land | New feature builds from advisor speculation |
| Send Stage 1 to external advisor | “Make DigitalGate better” without P0–P3 |

---

## When Ben uploads — developer actions

1. Attach / link walkthrough, Roe recording, Opportunity export into this pack (or sibling folder notes).  
2. Re-read marketing URLs once more only if needed.  
3. Mark Stage 1 **ready for advisor**.  
4. **Stop.** Bring advisor assessment back for P0–P3 triage before Stage 2 or any build.

---

## Post-advisor triage (next conversation)

| Priority | Meaning |
|----------|---------|
| **P0** | Must fix before Founding 10 |
| **P1** | Fix during Founding 10 onboarding |
| **P2** | Polish later |
| **P3** | Ignore for now |

Next milestone: **10 businesses successfully operating on DigitalGate** — not more architecture.

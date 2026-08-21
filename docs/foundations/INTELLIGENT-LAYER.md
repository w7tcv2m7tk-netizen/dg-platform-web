# DigitalGate Intelligent Layer (canonical north-star)

**Status:** Architecture locked · Platform Architect (Ben) · August 2026  
**Advisor confirmation:** External Business Advisor assessment (post briefing pack) · **adopted** Aug 2026  
**Positioning:** DigitalGate is an **intelligent business operating platform** — the Intelligent Layer that connects a business’s data, systems and digital presence, understands what is happening, recommends what should happen next, and increasingly takes action.  
**Does not override:** [COMMERCIALLY-READY-V1.md](./COMMERCIALLY-READY-V1.md) ship order · [APP-HIERARCHY.md](./APP-HIERARCHY.md) · Industry ecosystem docs  

> **Launch promise (customer language):**  
> Your business. Connected, understood and automated.  
> DigitalGate is an intelligent business operating platform that connects your systems, understands what’s happening and helps you take action.

> **Do not sell** DigitalGate as a collection of apps.  
> **Apps are capabilities underneath** that proposition.

Industry Apps are **vertical entry points**. The moat is **Twin → Intelligence → Action → Learning**.

---

## Advisor assessment — locked conclusions

| Conclusion | Implication |
|------------|-------------|
| Architecture fundamentally sound; thesis strong | Do **not** radical-change the platform |
| Biggest risk = too many competing attentions before commercial proof | Discipline > new features |
| Sell Intelligent Layer, not SaaS bundle | GTM + homepage + Overview IA |
| Twin / Decision Intelligence / Automation = clean progression | Avoid proliferating conceptual brands |
| Opportunity Engine is under-elevated | Major deepen priority (existing surface) |
| Staff CC ≠ customer “what next” home | Business Command Centre as primary landing (progressive) |
| Services + templates correct | No per-trade Apps |
| RE = flagship commercial proof | “DigitalGate for Real Estate” first; Acc/Services prove horizontal Core |
| Founding 10 language | Early access / preferred terms / influence — never “help us test” |
| Frameworks sit **above** the platform | Methodology IP delivered *through* DigitalGate — not competing products |

**Next phase slogan (locked):**  
Not “Build more DigitalGate.” → **Make DigitalGate feel intelligent.**

**Operator UX contract (locked):** [OPERATOR-EXPERIENCE.md](./OPERATOR-EXPERIENCE.md) — *Simple for the operator. Powerful for the business. Intelligent underneath.* Complexity stays underneath; the operator home is Overview · Priorities · Opportunities · AI Advisor · Apps.

---

## The ultimate loop (locked)

```
CONNECT      Bring the data in (connectors, systems, digital presence)
     ↓
CENTRALISE   Common business model (Universal Objects)
     ↓
UNDERSTAND   Digital Twin™ + scoring
     ↓
DECIDE       Decision Intelligence™ + Opportunity Engine + recommendations
     ↓
ACT          Automation + people + AI Actions / agents
     ↓
LEARN        Measure outcomes and improve the next recommendation
     ↓
GROW         Commercial outcomes
```

**DigitalGate AI** sits across the whole loop.

**Moat progression (keep this simple):**

```
Digital Twin™  →  Decision Intelligence™  →  Action  →  Learning
(representation)   (what matters / next)     (do it)    (improve)
```

The core product must become exceptionally good at:

> Understanding a business → finding opportunities → recommending actions → executing actions → measuring outcomes → **learning**.

Everything else supports that loop. **Feature sprawl is the #1 architectural risk now** — not missing features.

---

## Naming (locked — avoid brand sprawl)

Be careful introducing too many conceptual brands. Prefer this clean stack:

| Name | Role | One-line |
|------|------|----------|
| **Digital Twin™** | Underlying representation | DigitalGate builds a living digital representation of your business |
| **Decision Intelligence™** | What DigitalGate does with the Twin | Identifies opportunities, risks and next actions |
| **Automation** (platform capability) | Execution | Can execute those actions (with governance) |
| **Opportunity Engine™** | Bridge Twin → revenue / attention | Detects, scores, and recommends opportunities (customer UI: **Opportunities**) |
| **Business Health Score™** | Predictive health | Multi-dimension health feeding Decide |
| **DigitalGate Network Intelligence** | Cross-tenant cohort moat | Distinct — [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) |

Public/marketing may say “DigitalGate Intelligence™” for the decision layer; engineering docs use **Decision Intelligence** so it never collapses into Network Intelligence.

**Do not** invent parallel “™” product brands for every module. Frameworks (AI Visibility Framework™, Appraisal Magnet System™, etc.) are **methodology IP above the platform** — see § Frameworks.

---

## 1. Decision Intelligence™ (elevate)

Formal platform capability — **not** another dashboard. **Customer-facing equivalent of the staff AI Advisor.**

Continuously looks across CRM, pipeline, websites, SEO, AI visibility, ads, social, reputation, commerce, bookings, finances, operations, customer behaviour.

Produces:

| Stage | Output |
|-------|--------|
| What happened | Facts from Twin + events |
| Why it happened | Causal / correlative explanation |
| What matters | Prioritised signal (noise filtered) |
| What should happen next | Recommended actions |
| Can DigitalGate do it? | AI Action candidates (approve → execute) |

Seeds: Opportunity Engine™, Business Health, AI Advisor, Daily Briefing, Success Score, Recommended Actions. **Elevate into one Decision Intelligence surface** (Business Command Centre home) rather than scattering “intelligence” widgets.

---

## 2. Digital Twin™ (centrepiece / differentiator)

Not a nav item that stores records. The Twin is the platform’s **persistent understanding** of the business:

```
Business
 → People / Team
 → Customers
 → Products / services
 → Locations
 → Properties / assets
 → Leads → Opportunities → Transactions
 → Marketing · Reputation · Financial performance
 → Goals
 → Connected systems (GBP, website, ads, Xero, Industry Apps…)
```

**Story:** “DigitalGate builds a living digital twin of your business and uses it to help you understand, operate and grow.”

**Not:** “We have a CRM with AI.”

AI Advisor, Decision Intelligence, Automation, and Agents all operate **against the Twin**.

### Twin visualisation (founding priority — tangible, not a giant graph)

Make the Twin understandable to a customer — e.g. Business · Identity · Customers · Leads · Opportunities · Revenue · Marketing channels · Connected systems · Health · Opportunities detected · Recommended actions. Spec depth can stay simple; **feel** must be real.

---

## 3. Opportunity Engine™ (elevate — major priority)

**Bridge between the Twin and revenue / attention.** Under-elevated if treated only as “scaffold.”

Detects opportunities such as:

| Kind (examples) | Example |
|-----------------|---------|
| Attention / SLA | Vendor leads not contacted within 15 minutes |
| Growth | Strong visibility in one suburb, weak in another → guide + landing page + ads |
| Revenue risk | Outstanding invoices → payment reminder sequence |
| Expansion | CRM + Website but no AI Visibility → recommend Growth capability |

Shape already exists in Core (`PlatformOpportunity` + `/apps/opportunities` + Command Centre). **Deepen detection quality + customer-facing “what next”** — do not rebuild as a new App.

Canon: [OPPORTUNITY-ENGINE.md](./OPPORTUNITY-ENGINE.md)

---

## 4. Two Command Centres (locked distinction)

| Surface | Audience | Job |
|---------|----------|-----|
| **DigitalGate Command Centre** | Staff (`/command/*`) | Client health, opportunities, revenue, churn/expansion, platform health, advisor, benchmarking |
| **Business Command Centre** | Customer (primary landing — progressive) | “Here’s what is happening in your business and what you should do next” |

Customer home should feel like:

> Good morning. Business Health: 84. Three things that need attention. Recommended actions with Review / Act.

**Not** a wall of: CRM · SEO · Analytics · Automation as the first impression.

Staff Command Centre remains **DigitalGate-runs-DigitalGate**. Customer Intelligence home is **not** the staff CC cloned — it is Decision Intelligence on the Twin.

---

## 5. How apps fit (de-emphasise in the story)

Do **not** remove Apps. De-emphasise them as the **primary product story**.

Conceptual packaging (customer doesn’t need to “buy six apps”):

| Layer | Examples |
|-------|----------|
| **Core** | CRM · Commerce · Tasks · Calendar · Documents · Communications |
| **Industry** | Real Estate · Accommodation · Services · Finance · Property Management · Commercial |
| **Growth** | SEO · AI Visibility · Analytics · Social · Reputation |
| **Intelligence** (capabilities, not a shop SKU bundle) | Digital Twin · AI Advisor · Opportunity Engine · Scoring · Automation |

Customer should think: *“DigitalGate understands my business and gives me the systems I need.”*  
Not: *“I need to buy six apps.”*

Hierarchy packaging remains [APP-HIERARCHY.md](./APP-HIERARCHY.md).

---

## 6. Goals & planning (add)

Missing formal layer today. Lock as Core capability (design now; ship when Twin/Advisor are trustworthy):

```
Goal → KPIs → Activities → Opportunities → Actions → Results
```

Goals feed AI Advisor, Business Command home, and Opportunity ranking. Without Goals, “what should I do next?” lacks a target. **Not a Founding 10 blocker.**

---

## 7. Predictive Business Health Score™

Evolve Client Intelligence / Success Score / Health into **Business Health Score™** (Revenue · Lead flow · Conversion · Retention · Marketing · Website · SEO · AI Visibility · Reputation · Operations · Financial health).

Loop: Health declining → detect → identify cause → recommend → (optional) automate → measure → **learn**.

---

## 8. Universal Activity / Event layer

Event Bus is architectural ground truth. **Everything important becomes an event.** Automation: `EVENT → CONDITION → ACTION`. Industry Apps emit domain events onto the same bus.

---

## 9. Customer Journey / Lifecycle (universal)

Formalise one lifecycle; Industry Apps specialise stages — they do **not** invent separate CRMs:

```
Lead → Prospect → Customer → Active → Repeat → Advocate
```

| Industry | Example stage map |
|----------|-------------------|
| Real Estate Sales | Seller lead → Appraisal → Listing → Under contract → Settled → Past client → Referral |
| Services | Enquiry → Quote → Job → Invoice → Paid → Review → Repeat |
| Accommodation | Enquiry → Booking → Stay → Checkout → Review → Repeat guest |
| Property Management | Application → Lease → Active tenancy → Renewal / vacate → Advocate |
| Finance | Enquiry → Application → Submitted → Approved → Settled → Repeat |

---

## 10. Documents & knowledge → Twin + AI

**Business Brain™** (`/dashboard/brain`) is the customer knowledge corpus — seven dimensions (Business, People, Operations, Commercial, Knowledge, Technology, AI). Twin remains live operating state. Brain powers Advisor, Communications, Website, proposals, support and automation with [AI-GOVERNANCE.md](./AI-GOVERNANCE.md). Spec: [BUSINESS-BRAIN.md](./BUSINESS-BRAIN.md).

---

## 11. Ecosystem — keep three distinct

Marketplace · Network · Refer & Earn — do not merge. After founding product works.

---

## 12. Frameworks (methodology above the platform)

Frameworks **must not compete** with DigitalGate as alternate products. They sit **above** the platform as intellectual property / professional-services methodologies **delivered through** it.

Examples:

| Framework | Role |
|-----------|------|
| AI Visibility Framework™ | How we make the business understood and discoverable by AI |
| Appraisal Magnet System™ | How we generate vendor enquiries |
| Listing Pipeline Framework™ | How we convert opportunities into listings |
| Vendor Velocity System™ | How we increase and stabilise vendor acquisition |

```
DigitalGate Platform     = the technology
DigitalGate Frameworks   = the methodology operationalised by the platform
```

---

## Vertical commercial proof (locked)

| Priority | Role |
|----------|------|
| **Real Estate** | Flagship — first commercial proof (“DigitalGate for Real Estate”) |
| **Accommodation · Services** | Prove the Core is genuinely horizontal |
| Other Industry Apps | Progressive / Coming — do not equalise build effort |

Services remains **one App + Service Templates** — never Electrician/Plumber/Cleaner Apps. [SERVICES-APP.md](./SERVICES-APP.md)

---

## Conceptual navigation model (target IA)

**Implemented in Gen 2 shell** (`getCategorizedPlatformNavigation` → sidebar):

```
BUSINESS
  Overview · Business Profile · Digital Twin · Business Brain · Goals · Team

OPERATE
  CRM · Commerce · Websites · Infrastructure · Industry Apps

GROW
  Opportunities · AI Visibility · SEO · Automation · Analytics
  Social · Reputation · AI Communications

INTELLIGENCE
  Command Centre (staff) · Business Health · AI Advisor · Insights · Benchmarks · Reports

ECOSYSTEM
  Marketplace · Network · Refer & Earn

PLATFORM
  Apps & Platform · Settings (Billing, Connectors, …)
```

Twin / Goals / Advisor / Benchmarks / Reports nav homes exist as thin Intelligence surfaces that deepen over time; Overview still carries live Twin + Health signals today.

---

## Founding deepen priorities (not new product areas)

Judged against CR-v1 — deepen **existing** surfaces:

| Priority | What |
|----------|------|
| **A** | Opportunity Engine — useful detection + next actions |
| **B** | Customer Decision Intelligence — customer Advisor / “what next” home |
| **C** | Digital Twin visualisation — tangible Business Twin summary |

---

## Backlog filter (Founding 10)

**Question is no longer:** “What else should we add?”  
**Question is:** “What prevents the first ten customers from getting extraordinary value?”

Does it help customers…

1. Understand their business?  
2. Get more opportunities?  
3. Convert opportunities?  
4. Automate repetitive work?  
5. Make better decisions?

If not → **wait**.

---

## Homepage / explanation (brutally simple)

Architecture can be complex. Explanation cannot.

> **Your business. Connected, understood and automated.**  
> DigitalGate is an intelligent business operating platform that connects your systems, understands what’s happening and helps you take action.  
> One platform. Your business data. Your systems. Your intelligence. Your growth.  
> Then demonstrate it.

---

## Product stance

| Say | Don’t say |
|-----|-----------|
| Intelligent business operating platform | Collection of apps / SaaS bundle |
| Twin → Intelligence → Action → Learning | CRM with AI bolted on |
| Apps are capabilities underneath | “Buy six apps” |
| Business Command Centre: what should I do next? | Landing on a tool wall |
| DigitalGate for Real Estate (first proof) | Prove every industry equally first |
| Be among the first to operate on DigitalGate | Help us test / beta testers |
| Frameworks = methodology through the platform | Frameworks competing with the platform |
| Make DigitalGate feel intelligent | Build more DigitalGate |
| Exceptionally good at the growth loop | Software that has everything |

---

## What this does **not** change

1. **Commercially Ready v1** — no new major product area until customer independence.  
2. Founding ship list — deepen Twin / Opportunity Engine / Advisor / events on **existing** surfaces; do not block Founding 10 on Goals UI, Marketplace, Inbox, Voice, or Knowledge Brain.  
3. Staff Command Centre ≠ customer Intelligence home.  
4. Property / Services / Finance Industry Apps feed the Twin; they are not the moat.  
5. Pricing structure ($99 / $249 / $499 + Apps) stays — do not cram everything into Scale; Enterprise/Franchise remains a different model. Guard against underselling OS value with a casual “$499 platform” phrase alone.

---

## Execution filter

Does this strengthen **Connect → … → Learn → Grow** via Twin / Decision Intelligence / Opportunity Engine?

- Industry chrome without Twin/AI/Automation leverage → **defer**  
- Marketplace / third-party ecosystem before founding dogfood → **defer**  
- AI Actions without audit + approval → **defer**  
- New score widgets that don’t feed “what next?” → **defer**  
- New conceptual ™ brands without a clear Twin → Intelligence → Action role → **defer**

---

## Related

| Doc | Relationship |
|-----|----------------|
| [APP-HIERARCHY.md](./APP-HIERARCHY.md) | App packaging; Twin/AI/Automation are capabilities |
| [COMMERCIALLY-READY-V1.md](./COMMERCIALLY-READY-V1.md) | Founding ship order · five-criteria filter |
| [OPPORTUNITY-ENGINE.md](./OPPORTUNITY-ENGINE.md) | Opportunity detection — elevate |
| [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) | **Network** cohort moat (distinct) |
| [AI-GOVERNANCE.md](./AI-GOVERNANCE.md) | AI Actions |
| [CONNECTOR-ENGINE.md](./CONNECTOR-ENGINE.md) | Connect |
| [APP-MARKETPLACE.md](./APP-MARKETPLACE.md) · [NETWORK-LAYER.md](./NETWORK-LAYER.md) · [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) | Ecosystem trio |
| [PROPERTY-ECOSYSTEM.md](./PROPERTY-ECOSYSTEM.md) · [SERVICES-APP.md](./SERVICES-APP.md) | Verticals |
| [../strategy/BUSINESS-ADVISOR-BRIEFING.md](../strategy/BUSINESS-ADVISOR-BRIEFING.md) | Advisor pack + response lock |
| [../architecture/GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md) | Architecture brief |
| [../strategy/DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md) | GTM |

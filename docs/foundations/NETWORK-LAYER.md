# DigitalGate Network Layer

**Design now. Build when the network is useful.**

Community and Marketplace are a **strategic component** of the platform — not a Facebook/LinkedIn clone. They become powerful once enough businesses run on DigitalGate that introductions and recommendations have real signal.

**Do not implement this product surface yet.** Keep Organisation, User, Contact, Industry, Location, and permissions capable of supporting a future network without rebuilding the foundation.

---

## Platform surface map (target)

| Area | Role |
|------|------|
| **Business** | Operate the company (overview, twin, health) |
| **CRM** | Customers, pipeline, timeline |
| **AI** | Assist, scoring, recommendations |
| **Automation** | Workflows across Apps |
| **Growth** | Visibility, SEO, marketing |
| **Apps** | Industry + premium Apps |
| **Community** | Private professional network *(Phase 5)* |
| **Marketplace** | Services, software, opportunities *(Phase 5+)* |

Priority until then:

```
Core → CRM → Connectors → AI → Industry Apps → Intelligence → Scale
→ then Network (Community + B2B graph + Marketplace)
```

---

## Four interconnected layers (long-term)

| # | Layer | Promise |
|---|--------|---------|
| **1** | **Operating System** | Run your business. |
| **2** | **Intelligence** | Understand your business and tell you what to do. |
| **3** | **Network** | Connect you with people, businesses, and opportunities. |
| **4** | **Marketplace** | Buy software, services, integrations, and expertise. |

Together they turn *The Gateway to Your Digital World™* from a SaaS line into an **ecosystem businesses operate within** — not just software they use.

---

## 1. DigitalGate Community

A **private professional network for DigitalGate users** — not open social media.

Members can (when built):

- Follow businesses and industry communities  
- Ask questions · share wins / case studies · post opportunities · share resources  
- Comment, react, message  
- Join industry groups · attend DigitalGate events / webinars  
- Receive AI-curated recommendations  

**Example communities**

| Community | Who |
|-----------|-----|
| Real Estate | AU agencies, agents, marketers, property pros |
| Business Owners | Cross-industry operators |
| AI & Automation | Practitioners improving stack and workflows |

Value compounds as DigitalGate goes international (Country Packs + local groups).

---

## 2. Business-to-business network

Often more valuable than generic social posting.

**Recommended Partners** (illustrative):

- Web Designer — Brisbane  
- Accountant — Gold Coast  
- Mortgage Broker — Sydney  
- Commercial Lawyer — Melbourne  

Because the platform already knows industry, location, apps, and objectives, it can **intelligently connect** businesses inside the ecosystem. That is the network effect.

---

## 3. DigitalGate Marketplace

Extends [APP-MARKETPLACE.md](./APP-MARKETPLACE.md) beyond installable Apps.

| Lane | Examples |
|------|----------|
| **Services** | Accountants, lawyers, designers, developers, marketers, consultants |
| **Software** | Integrations, Apps, templates, automations, AI agents |
| **Opportunities** | Referrals, partnerships, leads, suppliers |

Third-party developers eventually list Apps here — SaaS → **ecosystem**.

**Reviews and Referrals** (trust + tracked introductions + disclosed fees) are specified separately — same Phase 5+ timing, different products: [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md).

---

## 4. Community data feeds the AI

The platform already (or will) know:

Industry · business size · location · Apps installed · objectives · growth areas · technology stack  

With **privacy controls** and consent (see [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) + [DATA-GOVERNANCE.md](./DATA-GOVERNANCE.md)), Network AI can recommend:

- Businesses to connect with  
- Relevant communities  
- Resources for the current growth objective  
- Partners specialised in the industry  

AI becomes a **business network intelligence layer**, not only an in-app assistant.

---

## Design-now requirements (no product UI yet)

Keep foundations network-ready:

| Concept | Why it matters later |
|---------|----------------------|
| **Organisation** | Network node; public profile flags; discoverability consent |
| **User / Membership** | Identity in Community; org affiliation; role |
| **Contact** | Distinct from *network peer* (external CRM ≠ DG member) |
| **Industry** | Community + partner matching |
| **Location / country** | Local partners, Country Pack–scoped groups |
| **Permissions** | Who can post, message, appear in Marketplace |
| **Consent settings** | Opt-in for discoverability, partner matching, intelligence contribution |
| **AppInstallation** | Marketplace software lane; partner “stack” affinity |

### Suggested future objects (do not schema-spam now)

Document only — implement in Network phase:

- `Community` / `CommunityMembership`  
- `NetworkProfile` (org or user, visibility + consent)  
- `Connection` / `Follow`  
- `MarketplaceListing` (service | software | opportunity)  
- `PartnerRecommendation` (derived, auditable)

Until then: prefer optional JSON settings on Organisation (`network.discoverable`, `network.partnerMatching`) over premature tables — **or** leave fields reserved in Core Object Spec when locking 1.0.

---

## Explicit non-goals (now)

- ❌ Building a consumer social network  
- ❌ Open public feed competing with LinkedIn  
- ❌ Community before critical mass of active orgs  
- ❌ Marketplace commerce before App install lifecycle is solid  

---

## Roadmap placement

| When | What |
|------|------|
| **Now – Phase 4** | Design constraints above; App Marketplace install model; Intelligence consent |
| **Phase 5 — DigitalGate Network** | Community v1 + B2B recommendations + Marketplace expansion |
| **Phase 5+** | Reviews App · Referral Engine / network (non-financial first; Paid/Commission behind compliance packs) — [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) |
| **After** | Third-party Apps in Marketplace; international communities |

See [ROADMAP.md](../ROADMAP.md).

---

## Related

- [PRODUCT-VISION.md](../PRODUCT-VISION.md) — four layers + Gateway brand  
- [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) — Reviews ≠ Referrals; disclosure + compliance  
- [APP-MARKETPLACE.md](./APP-MARKETPLACE.md) — App install / third-party ready  
- [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) — anonymised cohort intelligence  
- [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) — international communities via Country Packs  
- [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) — marketplace economics later  

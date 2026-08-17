# DigitalGate — Advisor Update (14 → 17 Aug 2026)

**Audience:** External Business Advisor  
**From:** Ben (Platform Architect)  
**Date:** 17 August 2026  
**Relates to:** [BUSINESS-ADVISOR-BRIEFING.md](./BUSINESS-ADVISOR-BRIEFING.md) (14 Aug) · [ADVISOR-EVIDENCE-STAGE-1.md](./ADVISOR-EVIDENCE-STAGE-1.md)

> **Purpose of this note:** Delta since the 14 Aug pack. Architecture / commercial locks **unchanged**. This is what moved in the last ~72 hours, where we stand commercially, and what still blocks Stage 1 evidence + Founding outreach.

---

## 1. Verdict (unchanged)

| Lock from 14 Aug | Still true? |
|------------------|-------------|
| Architecture sound — do not radical-change | **Yes** |
| Sell Connected → Understood → Decide → Act → Learn → Grow | **Yes** |
| Milestone = Founding 10 operate successfully — not “finish Gen 2” | **Yes** |
| Ready for open public SaaS launch? | **No** |
| Stage 1 product evidence (walkthrough / Roe recording / Opportunities export) | **Still outstanding** — Ben captures |

**Commercial mode remains:** Prove internally → sell Founding Customer Programme. Not full-scale launch.

---

## 2. What changed since 14 August (substance)

The last three days were **not** a new product thesis. They were a hard push to make **Gen 2 the live public operating surface** for the dogfood brands — websites, acquisition funnels, accommodation ops, and branded transactional email — so internal proof is on Gen 2, not WordPress.

### A. WordPress → Gen 2 public-site cutover (dogfood brands)

| Brand | Public Gen 2 posture (17 Aug) |
|-------|-------------------------------|
| **Roe Realty** | Live on Gen 2 hosting — listings, property detail (WP-style mosaic + details), Sold badges, contact/appraisal paths, Insights heroes restored |
| **Currumbin Valley Hideaway** | Live on Gen 2 — stay units, booking UI, calendars (Garden Studio first), Hideaway Circle, mosaic lightbox galleries |
| **Aëtherra** | Live on Gen 2 — WP-style centered header restored (logo over nav + socials) |
| **DigitalGate marketing** | Still the founding / pricing / OS narrative surfaces; product app at `app.digitalgate.com.au` |

**Strategic meaning:** Website presence for the RE + Acc dogfood orgs is no longer “WordPress is the public site, Gen 2 is the CRM.” Public capture and brand sites are moving onto the platform. That advances **Website integration** and **WP detach** on the Commercially Ready list — it does **not** by itself prove the Intelligent Layer to a first paying customer.

Apex WordPress live API calls for Gen 2 hosts were intentionally retired / gated (migration-only). Some legacy MCP / WP JSON summary endpoints now error — expected residue of detach, not a new architecture failure.

### B. Acquisition products shipped (RE + DG wedge)

Fullscreen, chromeless product funnels are live on dedicated subdomains:

| Funnel | URL | Role |
|--------|-----|------|
| **Property Report** (Roe) | `https://report.roerealty.com.au` | Vendor acquisition magnet → lead path |
| **Business Audit** (DigitalGate) | `https://audit.digitalgate.com.au` | DG acquisition magnet → diagnostic / sales follow-up |

Brand-site CTAs point at these funnels. Funnels create / update leads and attempt branded email (see §4).

**Strategic meaning:** This is the **RE proof wedge** and DG top-of-funnel in product form — closer to “sell outcomes,” still short of “feels intelligent end-to-end in the customer shell.”

### C. Accommodation dogfood (CVH)

- Stay booking on Gen 2 (enquire / calendar), unit galleries, Airbnb-style calendar bars  
- Platform iCal / calendar blocks  
- Garden Studio ordering + booking path aligned with other units  
- Mosaic galleries with lightbox (content below hero — not jammed into the hero)

**Strategic meaning:** Acc is usable for internal dogfood; still secondary to RE for Founding 10 wedge.

### D. Email / communications

- Platform sends branded HTML transactional mail via **Resend**
- **17 Aug update:** Resend plan holds one verified sending domain: **`mail.digitalgate.com.au`**. All brand transactional From addresses use that subdomain; **Reply-To** stays on human inboxes (`hello@digitalgate.com.au`, `hello@roerealty.com.au`, …). Do **not** add `mail.*` as a Vercel website domain.
- **Deploy blocker (same day):** Production Vercel builds were failing TypeScript (`ical-export` JSON type + CVH slug compare) since ~`ac615ac` — fix in tree; needs push to restore Ready deploys (site still on last Ready ~12h prior).

### E. Ops / deploy

- Production Gen 2 app and brand sites are **up** on last Ready deploy  
- Many recent `main` commits show **Error** in Vercel until the TS build fix ships  
- Vercel Hobby cron: lead follow-ups daily (`0 8 * * *`)  

---

## 3. Where we are vs the 14 Aug commercial frame

| Question (14 Aug) | Position now (17 Aug) |
|-------------------|------------------------|
| Architecturally right? | Still **yes** — no thesis change |
| Commercially differentiated in *product feel*? | Still **uneven** — more **public acquisition + brand-site proof** on Gen 2; Intelligent Layer dogfood evidence still thin |
| Ready to launch publicly? | Still **no** |
| Ready to open Founding 10 outreach? | **Closer on infrastructure / dogfood surfaces**; **not cleared** until Stage 1 evidence + P0/P1 punch list (incl. email deliverability) |
| Biggest risk | Unchanged: **attention sprawl** — last 72h was mostly site/funnel polish. Advisor Stage 1 captures still not done |

### Honest progress label

| Layer | Movement |
|-------|----------|
| Architecture / Core | Stable — no radical change |
| Public websites (dogfood) | **Large step forward** — Gen 2 as SoT for RR / CVH / Aëtherra |
| Acquisition funnels | **Shipped** — report + audit live |
| Intelligent Layer (Twin / decide / act in-app) | **Little new evidence** since 14 Aug |
| Founding sales readiness | **Blocked** on Stage 1 pack + email reliability + Gate 1 punch list |

---

## 4. Open risks / blockers (advisor should know)

1. **Stage 1 evidence still incomplete** — logged-in customer walkthrough, Roe vendor-lead recording, Opportunities export (same ask as 14 Aug).  
2. **Transactional email deliverability** — funnel “enquire” tests not landing; Resend domain verification for `digitalgate.com.au` / `roerealty.com.au` is P0 for acquisition products.  
3. **Attention risk** — high polish velocity on websites can delay the “does it feel intelligent?” proof the advisor asked for.  
4. **WP detach residue** — some Gen 1 summary/MCP paths broken; dual-write / plugin discipline still a programme, not finished.  
5. **Ben as glue** — Commercially Ready definition of done still unmet; cutover increased Ben’s operational load short-term.

---

## 5. What we are *not* claiming

- Not “Commercially Ready v1 complete”  
- Not “Intelligent Layer proven in practice”  
- Not “open SaaS launch”  
- Not “email acquisition funnel fully reliable” until Resend domains are fixed and re-tested  
- Not that marketing homepage polish replaced product evidence

---

## 6. Recommended focus next (aligned with 14 Aug locks)

**Do next (in order):**

1. Fix Resend sending domains for DG + Roe; re-test Property Report + Business Audit end-to-end (lead + email).  
2. Complete **Stage 1 evidence pack** (walkthrough + Roe path + Opportunities) and send for advisor assessment.  
3. Ruthless **P0/P1 punch list** from dogfood only — then Founding 10 outreach.  

**Do not:** open new Industry Apps, Marketplace, or more marketing rebuilds before Stage 1 returns.

---

## 7. Live URLs (quick reference)

| Surface | URL |
|---------|-----|
| Gen 2 app | https://app.digitalgate.com.au |
| DG marketing | https://digitalgate.com.au |
| Founding | https://digitalgate.com.au/founding-customers/ |
| Business Audit funnel | https://audit.digitalgate.com.au |
| Property Report funnel | https://report.roerealty.com.au |
| Roe Realty | https://roerealty.com.au |
| CVH | https://currumbinvalleyhideaway.com.au |
| Aëtherra | https://aetherra.com.au |

---

## One-paragraph summary (pasteable)

Since the 14 August briefing, DigitalGate has not changed architecture or commercial locks. The material shift is operational: Roe Realty, Currumbin Valley Hideaway, and Aëtherra now run public sites on Gen 2; Property Report and Business Audit live as dedicated acquisition funnels; accommodation booking/calendars dogfood on Gen 2. That strengthens website integration and WP detach, and gives the RE/DG wedge real public entry points. It does **not** yet answer whether the product feels like an intelligent operating platform to a first customer — Stage 1 evidence (walkthrough, Roe lead path, Opportunities) remains outstanding, and transactional email deliverability via Resend is currently broken after domain cleanup. Next: fix email → finish Stage 1 pack → P0/P1 only → then Founding 10 outreach.

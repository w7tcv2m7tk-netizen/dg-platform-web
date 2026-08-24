# Business Discovery Engine

**Status:** Active — **Business (B2B) Discovery** mode of the Prospecting & Opportunity Engine  
**Commercial:** Included in Prospecting & Opportunity Engine — **$99/mo**  
**Full architecture:** [PROSPECTING-ENGINE.md](./PROSPECTING-ENGINE.md)

---

## Scope (locked)

**Business Discovery** finds **businesses** that may need a product or service.

It is **not** the home for residential vendors, buyers, or property-owner prospecting. Those use **Vendor / Buyer / Commercial Property Discovery** via Industry Apps (e.g. Real Estate → Vendor Prospecting).

```
Growth App     = Business Discovery + shared pipeline/scoring for B2B
Industry App   = Consumer / property discovery front ends
Command Centre = “What should I do today?” action layer
```

---

## Product placement

| Layer | Owns | Operator sees |
|-------|------|----------------|
| **Growth App** (`/apps/prospecting/*`) | Business Prospect Book, Business Discovery, B2B scoring, audits, pipeline, follow-ups | Full B2B capability |
| **Command Centre** | Top prospects, recommended actions, follow-ups due, key signals | Next actions |
| **Real Estate App** | Vendor Prospecting, buyer opportunities, appraisals → listings | Property-owner opportunities |

---

## Organisation scoping (mandatory before customer exposure)

Every business prospect, discovery import, audit, engagement, score, and opportunity must carry `organisationId`. All reads/writes enforce scope **server-side**.

---

## Industry framing (Business Discovery only)

Same B2B engine; query defaults / packs adapt — **not** separate engines, and **not** residential models.

| Vertical | Business Discovery framing |
|----------|----------------------------|
| **DigitalGate** | Potential customers · Agency prospects · Partners · Resellers |
| **Finance** | Referrers · Lending-related businesses · Commercial prospects |
| **Services / Trades** | Local businesses · Service-fit scoring |
| **Real Estate (as seller to agencies)** | Target agencies · B2B partners — **not** residential vendors |

Residential vendors → [PROSPECTING-ENGINE.md](./PROSPECTING-ENGINE.md) · `/apps/re/vendor-prospecting`

Packs: `packages/platform-core/src/business-discovery/industry-packs.ts`

---

## Mental model

> **Prospecting & Opportunity Engine — $99/mo**  
> Find the right businesses and opportunities, understand them, prioritise them and turn them into conversations.

---

## Routes

| Surface | Path |
|---------|------|
| Business Discovery (canonical) | `/apps/prospecting/discovery` |
| Pipeline | `/apps/prospecting/pipeline` |
| Prospecting hub | `/apps/prospecting` |
| Vendor Prospecting (RE) | `/apps/re/vendor-prospecting` |
| Command Centre briefing | `/command/growth-engine` |
| Legacy CC Discovery URL | redirects → Apps Business Discovery |

---

## Related

- [PROSPECTING-ENGINE.md](./PROSPECTING-ENGINE.md)
- [OPPORTUNITY-ENGINE.md](./OPPORTUNITY-ENGINE.md)
- [OPERATOR-OS.md](./OPERATOR-OS.md)

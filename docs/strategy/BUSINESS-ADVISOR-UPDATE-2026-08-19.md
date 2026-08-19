# DigitalGate — Advisor Update (17 → 19 Aug 2026)

**Audience:** External Business Advisor  
**From:** Ben (Platform Architect)  
**Date:** 19 August 2026  
**Relates to:** [BUSINESS-ADVISOR-BRIEFING.md](./BUSINESS-ADVISOR-BRIEFING.md) (14 Aug) · [BUSINESS-ADVISOR-UPDATE-2026-08-17.md](./BUSINESS-ADVISOR-UPDATE-2026-08-17.md) (17 Aug)

> **Purpose of this note:** Delta since 17 Aug. Architecture thesis **unchanged**. The material shift is **operating mode**: website/proposition work is frozen; the 30-day job is proving the commercial engine by filling Founding 10. Conversion path is live. Outreach starts now.

---

## 1. Verdict

| Lock | 19 Aug |
|------|--------|
| Architecture sound — do not radical-change | **Yes** |
| Sell Connected → Understood → Decide → Act → Learn → Grow | **Yes** |
| Milestone = Founding 10 operate successfully | **Yes** |
| Ready for open public SaaS launch? | **No** |
| Public website / proposition redesign | **Frozen** until Founding 10 is filling |
| Ready to start Founding 10 **conversations**? | **Yes** — conversion path is live. Not waiting on more product. |

**Commercial mode now:** Talk → demonstrate → close → learn → repeat. Not “finish Gen 2.” Not “one more homepage pass.”

---

## 2. Operating lock (18 Aug) — new since last note

Canon: [COMMERCIAL-ENGINE.md](./COMMERCIAL-ENGINE.md) · copy: [FOUNDING-10-OUTREACH.md](./FOUNDING-10-OUTREACH.md).

**30-day objective:** Fill Founding 10.

**Channels (in order):** Ben’s existing network → RE prospecting → 3–5 qualified Founding Resellers who **open doors**. Ben remains the closer. Partners introduce; they do not get a login and a brief to sell the platform.

**Daily (weekdays):** initiate **10 customer + 5 partner** conversations. Saturday off. Sunday 30–60 min CEO review. Every CRM row needs a next action.

**Tone:** personal update to people Ben already knows — not a SaaS campaign. “I’ve been building something significant, it’s now ready, and I thought of you.” Customer vs Founding Reseller are different first messages.

**Freeze until Founding 10 is filling:** public website redesign, partner portal / commission dashboard, ads, new Industry Apps, seven-day hustle.

**P0 product still allowed:** anything that blocks a live demo, Founding application, consultation booking, or acknowledgement email.

Command Centre now has a Brisbane **90-day sales week** (`/command/sales-week`) that prompts the current block.

---

## 3. What moved in product (17–19 Aug)

This was not sprawl for its own sake. It was the conversion path and the Intelligent Layer surfaces the 14 Aug pack asked to *feel*.

| Ship | What it is | Why it matters |
|------|------------|----------------|
| **Founding 10 ack** | Application is not treated as a generic contact enquiry. Dedicated email + CRM pipeline `founding_10`. | First-touch honesty — apply ≠ accepted |
| **Contact vs consult** | Contact ack vs Platform Consultation confirmation, Zoom invite, slot buffer, CRM agenda | Demo / consult path is real |
| **CRM routing** | DigitalGate website leads land in CRM Opportunities, not the RE vendor-leads beta gate | Operator can work a lead without `re.beta` |
| **Digital Twin** | Live signals on `/dashboard/twin` instead of burying them on Business Profile | Twin is a product surface, not a slogan |
| **Goals** | Org goals on Overview / Twin progress / Advisor | “Decide” has something to decide against |
| **Sales week** | Staff calendar of Mon–Fri engine + Sunday review | Operating rhythm is in the cockpit |
| **Production** | Vercel recovered after client-barrel / missing-export build failures | App is Ready again |

**Transactional email:** Contact, Founding, and consultation acks send from `hello@mail.digitalgate.com.au` (Resend). 17 Aug deliverability panic is **no longer the blocker** for starting conversations. Still worth a 20-minute inbox pass after any form Ben has not tested since the 18 Aug rewire.

**AI:** Model Router now has three transports: Vercel AI Gateway (preferred when `AI_GATEWAY_API_KEY` or OIDC is present), then Anthropic, then direct OpenAI. Template fallback is unchanged. Production still has `OPENAI_API_KEY`; the OpenAI **account quota** is unfunded — route high-value calls through Gateway (`openai/gpt-5.6-sol`) so they bill on Vercel, not BYOK. Overview briefing remains rule-based (Twin/Goals), not an LLM.

**Website:** Last homepage/footer pass was 17 Aug. **No further public-site work** unless conversion is broken.

---

## 4. Where we are vs 14 / 17 Aug

| Question | 17 Aug | 19 Aug |
|----------|--------|--------|
| Architecturally right? | Yes | **Yes** |
| Public Gen 2 dogfood sites | Shipped (RR / CVH / Aëtherra) | Unchanged — freeze polish |
| Acquisition funnels | Report + Audit live | Unchanged |
| Intelligent Layer in-app | Thin evidence | **Twin + Goals shipped** — still not “proven with a customer” |
| Email | Broken / unverified | **Acks sending** on DG conversion path |
| Founding outreach | Blocked on Stage 1 pack + email + Gate 1 | **Cleared to start conversations** |
| Customers in Founding 10 | 0 | **0** — day 2 of the 30-day clock |
| Attention risk | Website polish delaying proof | **Lock is designed to kill that** — if Ben stays in product, the lock failed |

### Honest progress label

| Layer | 19 Aug |
|-------|--------|
| Architecture / Core | Stable |
| Public websites | Good enough — **frozen** |
| Conversion path (apply / consult / ack / CRM) | **Live** |
| Intelligent Layer | Twin + Goals exist; not yet customer-proven |
| Commercial engine | **Defined and staff-prompted; not yet run** |

---

## 5. What we are *not* claiming

- Not “Commercially Ready v1 complete”  
- Not “Intelligent Layer proven with a paying customer”  
- Not “open SaaS launch”  
- Not “Founding 10 filling” — zero conversations logged as a programme yet  
- Not that Stage 1 recordings (walkthrough / Roe path / Opportunities export) are done — they are **nice for the advisor**, not a gate on Ben talking to people he already knows  
- Not that OpenAI billing is production-ready for Intelligence

---

## 6. Risks the advisor should watch

1. **Execution, not product.** The next failure mode is Ben building instead of initiating 15 conversations a weekday.  
2. **Stage 1 pack still uncaptured** — does not block outreach; still useful for advisor assessment if Ben records a 15-min demo.  
3. **Partner channel too early** — do not build a portal; 3–5 A-list introducers only, Ben closes.  
4. **AI quota** — OpenAI billing is Ben’s ops item, not a reason to delay sales.

---

## 7. What Ben does next (this week)

1. Existing-network first wave (not ads, not website). Scripts in [FOUNDING-10-OUTREACH.md](./FOUNDING-10-OUTREACH.md).  
2. Weekdays: 10 customer + 5 partner conversations started. CRM next action on every row.  
3. Book conversations; ask how they run the business digitally **before** demoing.  
4. Product only if demo / apply / consult / ack breaks.

**Do not:** redesign digitalgate.com.au, enable `re.beta` on DigitalGate to “fix” leads, workshop copy, wait on Gate 1 ticks or LLM billing.

---

## 8. Live URLs

| Surface | URL |
|---------|-----|
| Gen 2 app | https://app.digitalgate.com.au |
| Sales week (staff) | https://app.digitalgate.com.au/command/sales-week |
| DG marketing | https://digitalgate.com.au |
| Founding apply | https://digitalgate.com.au/founding-customers/ |
| Platform consult | https://digitalgate.com.au/strategy-session/ |
| Business Audit | https://audit.digitalgate.com.au |
| Property Report | https://report.roerealty.com.au |

---

## One-paragraph summary (pasteable)

Since 17 August the architecture and Intelligent Layer thesis are unchanged. What changed is operating mode: as of 18 August DigitalGate is under a commercial lock — freeze the public website, stop speculative product, and spend 30 days filling Founding 10 through Ben’s network, then RE prospecting, then a handful of Founding Resellers who introduce while Ben closes. The conversion path is now live (Founding application vs contact vs consultation, dedicated acks, CRM without the RE beta gate). Twin and Goals shipped as in-app Intelligent Layer surfaces. Outreach is cleared to start; zero Founding customers are in yet. The risk is no longer “is the site good enough?” — it is whether Ben actually runs 10+5 conversations a weekday instead of building. Stage 1 demo recordings for advisor assessment are still outstanding and should not delay those conversations.

# DigitalGate — Advisor brief: completing AI integration

**Audience:** External Business Advisor  
**From:** Ben (Platform Architect)  
**Date:** 24 August 2026  
**Status:** For discussion — not a build-everything mandate  
**Architecture canon:** [AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) · [AI-GOVERNANCE.md](../foundations/AI-GOVERNANCE.md) · [INTELLIGENT-LAYER.md](../foundations/INTELLIGENT-LAYER.md)

---

## 1. One-line verdict

**Model Router is live.** That is not the same as “AI is finished everywhere.” Completing AI integration means finishing the **Brain → Advise → Act → Learn** loop across Core surfaces — with DigitalGate owning data and tools — not adding chatbots to every screen.

---

## 2. What is already true (Live)

| Layer | Live today |
|-------|------------|
| **Hosting** | Vercel runs the app; Vercel is **not** the AI product |
| **Model Router** | Gateway → (failover) Anthropic / OpenAI; Sol when paid credits allow; free-tier falls back to Gateway standard model |
| **AI Advisor Ask** | Free-text questions synthesised from Brain / Twin / Goals evidence |
| **AI Assist** | Draft help in CRM, listings, social, profile (`/api/v1/ai/assist`) |
| **Support Assist** | Floating support chat can auto-reply via the same router |
| **Tool path (thin)** | Permissioned tool execute + usage ledger started (Advisor “Do it” vertical slice) |
| **Honesty floor** | Template / briefing fallback when the model fails — never invent |

**Locked principle:** AI never owns business data. DigitalGate owns records; AI interprets and acts **through** DigitalGate tools.

---

## 3. What “complete” means (definition of done)

AI is “integrated throughout the platform” when an operator can, on any major Core surface:

1. **See** what matters (Twin / Overview / Command Centre)  
2. **Ask** why / what next (Advisor, grounded in Brain + Twin)  
3. **Act** with one click where safe (tool → CRM / Task / Automation)  
4. **Audit** what AI recommended, who approved, what ran  
5. **Learn** outcomes back into Twin / Brain (not a dead-end chat)

It does **not** mean a generic chatbot on every page.

---

## 4. Gap map — what still needs doing

### A. Product / experience (highest leverage)

| Gap | Why it matters | Suggested outcome |
|-----|----------------|-------------------|
| **Advisor “Do it” dogfood** | Vertical slice exists; not yet the default operator habit | One recommendation → approve → tool → CRM/Task → audit, used daily by DigitalGate + 1 founding customer |
| **Overview / Command Centre ↔ Advisor** | Briefings are strong; live LLM synthesis still uneven across cockpits | Same Ask / Do-it pattern on Overview priorities and CC daily briefing |
| **Context depth** | Some answers thin if Brain / Goals / CRM sparse | Founding orgs complete Profile, Goals, CRM floor so Advisor has something to reason over |
| **Industry surfaces** | RE / Services / Finance mostly rule + Assist drafts | Industry Apps consume Core AI Service — no per-app model keys or parallel chatbots |
| **Prospecting / Documents AI** | Engines locked; AI scoring & template population still early | Score / recommend / draft via Core router; e-sign stays provider-backed |

### B. Platform / engineering

| Gap | Why it matters | Suggested outcome |
|-----|----------------|-------------------|
| **Context Builder v1** | Prompts still assembled per-caller | One Context Builder: Profile · Twin · Goals · Opportunities · Tasks · visibility signals · (staff) Platform Knowledge |
| **Tool catalogue expansion** | Few tools vs App manifests’ `aiTools` | CRM follow-up, task create, lead assign, opportunity stage — all permission-gated |
| **Usage & cost observability** | Ledger started; operator/staff dashboards thin | Per-org tokens / cost / failure reasons visible to staff |
| **Billing for AI** | Sol needs paid Gateway credits; OpenAI BYOK quota separate | Clear commercial rule: customer AI usage on DigitalGate plan vs platform dogfood credits |
| **Embeddings / retrieval** | Brain retrieval deeper than “Live” in places | Controlled RAG only where docs exist; never invent |

### C. Governance / commercial

| Gap | Why it matters | Suggested outcome |
|-----|----------------|-------------------|
| **Auto-execute off by default** | Already policy | Keep; expand only with explicit org rules |
| **Client-facing drafts** | Email / web / proposals | Always draft → human send/publish |
| **Packaging** | What AI is included in Core vs paid AI tier | Advisor + Assist in platform story; heavy Agents / Voice later as Growth or add-on |
| **Support chat vs Advisor** | Two different jobs | Support = help with DigitalGate; Advisor = run *this* business — keep distinct |

### D. Explicitly later (do not confuse with “AI integration”)

- Full Voice Agents / AI Communications product  
- Autonomous multi-step agents without approval  
- Building our own e-sign / DocuSign competitor  
- Per-Industry “AI Apps” with separate providers  

Architecture already says: dogfood **Brain → Advisor → Tool → Action → Audit** before those.

---

## 5. Recommended sequence (for advisor challenge)

**Phase 1 — Prove the loop (2–4 weeks)**  
Dogfood Advisor Ask + Do-it on DigitalGate org and one founding RE customer. Fix context gaps (Goals, CRM, tasks). Meter Gateway credits so Sol or standard models stay reliable.

**Phase 2 — Same loop on Core cockpits**  
Overview + Command Centre priorities use the same Ask / evidence / Do-it pattern. Expand 3–5 high-value tools (task, follow-up, assign, stage).

**Phase 3 — Industry consumption**  
RE Vendor / listing Assist and Documents templates call Core AI Service. No new AI silos.

**Phase 4 — Agents & channels**  
Voice / outbound agents only after Phase 1–2 are habit and audited.

---

## 6. Questions for the advisor

1. Should “complete AI” be a **Founding 10 dogfood milestone**, or wait until after 10 are operating?  
2. Is the commercial story **“Connected Business with an Advisor”** (recommended) or **“AI platform with chat everywhere”** (we advise against)?  
3. How much **AI usage cost** should DigitalGate absorb for founding customers vs include in subscription?  
4. Priority of **Act (tools)** vs **Ask (better answers)** if we can only fund one in the next 30 days?  
5. Any governance red lines beyond: no auto CRM writes, no auto client send, no cross-tenant context?

---

## 7. Bottom line for the conversation

We have the **pipe** (Model Router + Gateway).  
We do not yet have the full **operating system loop** on every Core surface.

Finishing AI integration = **one shared AI Service**, deep context, Advisor that can act through DigitalGate tools, audit/learn — Industry Apps as consumers. Not a chatbot wallpaper.

Happy to adjust sequence based on your commercial and risk view.

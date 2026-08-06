# Business Profile & Business Workspace

**Status:** Implemented (Platform 1.0 foundation)  
**Related:** [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md), [ADR 0006](../adr/0006-digital-twin-concept.md)

---

## Concept

**Business Profile** is the canonical **Digital Business Identity** — not just contact details. Every app, connector, and AI capability reads from it via `getBusinessContext()`.

**Digital Twin™** is the live **computed state** (scores, metrics, connectors) built on top of the profile.

When a client logs in, they open **their business** (Business Workspace), not a CRM:

| Workspace area | Route |
|----------------|-------|
| Overview | `/dashboard` |
| Business Profile | `/dashboard/business` |
| Team | `/dashboard/settings/team` |
| Apps & plan | `/dashboard/apps` |
| Settings | `/dashboard/settings` |

Industry apps (CRM, Real Estate, etc.) appear below in the sidebar as installed modules.

---

## Profile sections

| Section | Storage | Editable |
|---------|---------|----------|
| **Identity** | `settings.profile` | Yes — name, trading name, logo, colours, industry, ABN/ACN, hours, timezone |
| **Contact** | `settings.profile` | Yes — phones, emails, support details |
| **Online presence** | `settings.profile.social` | Yes — GBP, social URLs |
| **Brand voice** | `settings.profile.brandVoice` | Yes — tone, services, audience, competitors (powers AI) |
| **Digital Twin signals** | Computed | Read-only on profile page |
| Marketing / Sales / Finance KPIs | Twin + apps | Read-only (future: dedicated panels) |

---

## API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/org/profile` | GET | Read profile |
| `/api/v1/org/profile` | PATCH | Update profile (partial merge) |
| `/api/v1/org/profile` | POST | Force sync from WordPress onboarding |
| `/api/v1/ai/assist` | GET | Business context + AI system prompt |
| `/api/v1/ai/assist` | POST | Generate content (`social_post`, `email_draft`, `briefing`) using context |

---

## Developer contract

```typescript
import { getBusinessContext, buildAiSystemPrompt } from "@dg/platform-core";

const context = await getBusinessContext({
  organisationId,
  organisationName,
  enabledAppIds,
  twinSnapshot, // optional
});

// Inject into AI Service
const systemPrompt = buildAiSystemPrompt(context);
```

Every new app **must**:

1. Read identity/industry from `getBusinessContext()` — never re-prompt for business name
2. Write activity back to Universal Timeline / Twin inputs where relevant
3. Not duplicate profile fields in app-specific tables

---

## Data location

- **Gen 2:** `organisations.settings.profile` (JSON)
- **Gen 1 source:** WordPress onboarding → `/portal/me` → one-way sync

---

## Roadmap

- [ ] Persist full Twin graph (not just snapshot)
- [ ] Pull AI Visibility / SEO scores into Twin summary automatically
- [ ] Team members on profile (linked to Clerk)
- [ ] LLM provider hook for `/api/v1/ai/assist` (OpenAI / Anthropic)
- [ ] Billing section on profile (Stripe Customer Portal embed)

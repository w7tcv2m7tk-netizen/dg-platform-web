# Communications

**Status:** Architecture lock — August 2026  
**Layer:** **CORE** (not Infrastructure mailbox hosting, not a Growth “email app”)  
**Nav label:** Communications  
**Capability:** DigitalGate Communications (business communication layer)  
**Version:** Core — Communications (direction lock; Email v1 slice TBD)

**Related:** [DOCUMENTS-AND-SIGNING.md](./DOCUMENTS-AND-SIGNING.md) · [APP-HIERARCHY.md](./APP-HIERARCHY.md) · [ai/COMMUNICATIONS-ARCHITECTURE.md](../ai/COMMUNICATIONS-ARCHITECTURE.md) · [PROSPECTING-ENGINE.md](./PROSPECTING-ENGINE.md) · [AI-GOVERNANCE.md](./AI-GOVERNANCE.md) · [BUSINESS-BRAIN.md](./BUSINESS-BRAIN.md)

---

## Ownership principle (developer lock)

**Communications is a Core business capability, not an Industry App and not a Gmail/Outlook clone.**

Industry Apps, Prospecting, Automation, Advisor and Command Centre may create, surface and act on communications in their own workflows, but the underlying **communication record**, thread, channel, delivery status, provenance and audit history belong to **Core Communications**.

**Google Workspace / Microsoft 365 remain the authoritative mailboxes.** DigitalGate is the **business intelligence and orchestration layer** around the mailbox — association, history, automation, AI draft, next action — not the mailbox provider.

**Do not ship a second customer “AI Communications” silo.** Voice agents / Call Centre may stay a **Growth commercial add-on** (capacity / monetisation), but Calls and AI Assist live under **Core Communications** IA, and every voice/SMS/email row must land in the same Communication History.

---

## Product lock

```
CORE
  CRM
  Communications          ← nav (before Documents — Know → Communicate → Document → Transact)
  Documents
  Commerce
  Design Studio
        │
        └── DigitalGate Communications   ← capability
              │
              ├── Inbox · Email · SMS · Calls · Outreach · Automations
              ├── Templates · Signatures (Signature Studio) · AI (Assist)
              ├── Channels: Email · SMS · Voice · WhatsApp · …
              ├── Sources: Manual · Automation · AI Assist · Prospecting · Agent · System · Mailbox
              └── Linked to: Organisation · Contact · Company · Opportunity · Task ·
                             Customer · Property · Document · Campaign · Automation · Agent
```

**Do not** build an “Email App.”  
**Do** build a **Communication Record** inside Core — a Universal Object activity source.

Primary operator question (every surface should serve this):

> Who did we communicate with, what was said, why was it sent, and what happens next?

**Home (direction):** greeting · Needs attention · Inbox preview · Quick actions (+ Email · + SMS · ✦ Write with AI · Schedule · Start outreach) · Recent activity — not SMTP/provider mechanics.

Secondary nav (modules — not separate products; **locked August 2026**):

| Surface | Role |
|---------|------|
| **Inbox** | Conversations that need attention (not synonymous with Email) |
| **Email** | Send/manage email channel (Compose · Sent · Scheduled · Mailboxes) |
| **SMS** | Messaging channel (same Communication Record) |
| **Calls** | Call history / recordings — voice capacity tooling may deep-link; history is Core |
| **Outreach** | Campaigns / sequences that emit Communication records |
| **Templates** | Reusable copy / structure |
| **Signatures** | **Signature Studio** |

**Do not** put Email or Email history under CRM. CRM → Timeline is the universal cross-business history; Communications does **not** duplicate a second “Activity / Communication History” nav item.

**Do not** surface Growth **AI Communications** in customer navigation. AI Assist is **Write with AI** inside Communications (shared AI Service).

**Documents** stay a separate Core app (files · agreements · signing) — related to, not inside, Communications.

---

## Split capabilities (keep clean)

| Capability | Layer | Owns |
|------------|-------|------|
| **Communication Engine** | Core | Message, Thread, Channel, Participant, Activity link, delivery status, audit |
| **Connected Services (customer)** | Settings | Human “Connect Google Workspace / Microsoft 365 / …” — no OAuth jargon |
| **Connector Engine (operator)** | Platform / Command | Scopes, probes, credentials, platform-ready health |
| **Mailbox / Workspace connectors** | Core / Connectors | OAuth to Google / Microsoft (Gmail·Outlook · Calendar · Contacts over time); never store passwords |
| **Infrastructure Email** | Infrastructure | Domains / hosting / DNS / mailbox *provisioning* — **not** business CRM email UX |
| **Automation** | Automation App | Triggers that *create* Communication records (source = Automation) |
| **AI Assist** | Core + AI Service | Draft / classify with Brain context; human review before send |
| **Voice agents (Growth packaging)** | Growth add-on | Monetised agent capacity / Call Centre — history still Core |
| **Prospecting / Outreach** | Growth (Prospecting) | Campaign loops that emit Communication records into Core |

Industry Apps **consume** Communications. They do not each invent inbox sync or activity timelines.

Advisor loop (product): Advisor surfaces gaps → Assist drafts → human Approve → Communications sends → Timeline + Brain update. Not “here is an AI email writer.”

**Communication Health (direction):** response rate · response time · unanswered · follow-up gaps · deliverability · automated vs AI-assisted counts — feeds Business Health / Advisor.
---

## Canonical object model (lock)

```
Communication
  → Message
  → Channel        (email | sms | voice | whatsapp | …)
  → Participant
  → Thread
  → Activity       (CRM timeline)
  → Source         (manual | automation | ai_assist | prospecting | agent | system)
  → Automation     (when source = automation)
  → AI generation  (draft metadata, model, prompt lineage — when used)
  → Delivery status
  → Audit / provenance
```

Every message should be associable with:

Contact · Company · Opportunity · Task · Campaign/outreach · Automation · User/agent · Document · Property (when relevant)

Example: Nathan (AIM Financial) → Opportunity → Emails → Tasks → Documents → Notes → Calls → Advisor recommendations — **one connected body**, not PDF in Dropbox + mail in Gmail + deal in CRM.

---

## Three mechanisms (do not collapse)

| # | Mechanism | Who decides | Who sends |
|---|-----------|-------------|-----------|
| 1 | **Manual** | Human writes | Human sends |
| 2 | **Automated** | Rule / event | System sends (templated / fixed) |
| 3 | **AI-assisted** | Situation detected or user asks Assist | AI drafts → **human reviews → human sends** |
| 4 | **AI Agent** (later) | Agent proposes | Draft + approval under governance — **not** in Email v1 |

Keep #4 behind [AI-GOVERNANCE.md](./AI-GOVERNANCE.md). Never blur Automated vs AI Assist in UI or analytics.

---

## AI Assist (not “✨ Generate email”)

Composer / Assist modes (illustrative catalogue):

Draft reply · Follow up · Introduce · Check in · Request information · Confirm meeting · Send proposal · Re-engage · Thank customer · Create from task · Create from Advisor recommendation

Context is **already** on the record (company, opportunity, prior thread, meetings, notes, Brain, documents, stage). Assist must not open with “Please provide some context.”

Governance: **AI drafts → Human reviews → Human sends.**

---

## Delivery & intelligence (model now; depth later)

### Email / message status

`draft` · `scheduled` · `sent` · `delivered` · `bounced` · `opened` · `replied` (plus channel-specific as needed)

### AI classification (Direction — after Assist + Context Builder maturity)

Interested · Not interested · Question · Objection · Meeting request · Information requested · Unsubscribe · Out of office

Surfaced as Command Centre / Priorities (“3 conversations require attention”) — not another inbox to hunt through.

---

## Provenance (“Why am I seeing this?”)

Every automated or AI-assisted communication must expose:

- Why it was created / sent  
- Trigger or rule (if any)  
- Generated by (system / AI Assist / agent)  
- Approved / sent by (human)  
- Related opportunity / contact / campaign  
- Suggested next action  

Trust and auditability > clever send volume.

---

## Google + Microsoft

**Prioritise:** Google Workspace / Gmail · Microsoft 365 / Outlook via **OAuth**.

Allow DigitalGate to (scoped, least privilege):

- Read inbox / sync sent  
- Send email (as the connected identity)  
- Associate with Contact / Company / Opportunity  
- Maintain threads; detect inbound replies  
- Create activities; fire automations  
- Feed AI Assist drafts  

**Do not** become the mailbox provider. **Do not** ask for mailbox passwords.

---

## Manual email (v1 quality bar)

Compose from almost anywhere with **automatic context**:

Contact → Email · Opportunity → Email · Task → Email · Command Centre → Email · Advisor → Draft email

---

## Prospecting loop (connected acquisition)

```
Prospect → Discovery → Opportunity → Outreach → Email → Reply detected
  → Conversation → Meeting → Opportunity update → Task → Follow-up
```

One continuous process — not Prospecting app + email app + CRM + automation as islands. Outreach emits **Core Communication** records.

---

## Communication History (global)

Filters: **All | Email | SMS | Voice | Automated | AI | Outreach**

Each row should answer who / what / why / status / related opportunity — e.g. manual send with delivered/opened, or automated follow-up with trigger + AI-generated flag + delivery.

---

## Events (catalogue lock — emit when infrastructure ready)

| Event | When |
|-------|------|
| `communication.created` | Record created |
| `communication.sent` | Sent (any channel) |
| `communication.delivered` | Provider delivery confirmation |
| `communication.opened` | Open tracked (where available) |
| `communication.replied` | Inbound reply associated |
| `communication.bounced` | Bounce |
| `communication.draft_created` | Draft (manual or Assist) |
| `communication.scheduled` | Scheduled |
| `communication.automation_fired` | Automation-sourced send |
| `communication.ai_drafted` | AI Assist produced draft |
| `communication.classified` | AI classification applied |
| `communication.associated` | Linked to Contact / Opportunity / … |

Same bus as Automation → Advisor → Brain → Timeline → Notifications.

---

## Sidebar direction

Prefer **Communications** (not “Email”). Operator-facing IA (modules under one Core app — not separate products):

```
COMMUNICATIONS
├── Inbox
├── Email
│   ├── Compose
│   ├── Sent
│   ├── Drafts
│   ├── Scheduled
│   ├── Templates
│   └── Signatures
├── SMS          (later channel)
├── Calls        (voice history in Core; Growth packages agent capacity)
├── Outreach
├── Automations
├── AI
│   ├── Drafts / Assist
│   ├── Suggestions
│   └── Agents   (governance-gated; not Email v1)
├── History      (global Communication History — primary lens)
└── Settings
    ├── Accounts / Connected mailboxes
    ├── Signatures (Signature Studio)
    ├── Sending
    └── Preferences
```

**Primary experience** remains Needs attention + Inbox + Quick actions + Recent activity — not SMTP/provider mechanics.

**Signature Studio (direction):** identity · branding · content · behaviour (default / reply / new / internal) · Gmail + Outlook preview — under Communications → Settings → Signatures.

**Infrastructure → Email** stays hosting/DNS/mailbox provisioning.  
**Growth voice packaging** stays monetised agent capacity — history still Core.
---

## Communication Service (runtime stack)

```
DigitalGate Communications (Core App)
  → Communication Service (orchestrator · records · audit)
       → Provider adapters (swappable)
            Email: Google / Microsoft / Resend (transactional)
            SMS / Voice / Numbers: TelephonyProvider (Twilio first · Telnyx evaluate)
            Voice synthesis / ConvAI: ElevenLabs (Voice Provider — separate from telephony)
            WhatsApp: later (Meta / carrier)
  → Automation Engine
  → AI Service (Assist + classification)
  → Universal Objects (Contact · Company · Opportunity · …)
  → Timeline / Activity
  → Audit Log / provenance
```

### Provider-agnostic telephony (locked)

**Do not** architect Communications around Twilio (or any single CPaaS).

```
Communication Service
        │
  TelephonyProvider adapter
        │
   ┌────┴────┐
Twilio    Telnyx · future
(first)   (evaluate)
```

**DigitalGate owns:** Contacts · Conversations · Messages · Calls · Phone numbers (as Universal Objects) · Delivery status · Recording references · Transcripts · Opt-outs · Communication history · AI drafts · Automation · Audit trail.

**Provider owns:** Telecommunications — SMS segments, PSTN/SIP minutes, number inventory, carrier routing, webhook delivery.

| Decision | Lock |
|----------|------|
| First production telephony adapter | **Twilio** (mature SMS + programmable voice; documented AU pricing) |
| Evaluate before volume / number scale | **Telnyx** (AI-voice stack positioning; AU ACMA sender-ID docs from 1 Jul 2026) |
| Customer Connected Services copy | **Connect business phone** / **Connect SMS** — never “Connect Twilio” / “Configure Messaging API” |
| Voice synthesis (ElevenLabs) | Separate **Voice Provider** from telephony — agents speak via ElevenLabs; calls may still terminate via telephony adapter |
| AU compliance | Sender-ID / ACMA requirements apply **regardless of provider** — enforce in Communication Service |

Code: `packages/platform-core/src/communications/providers/telephony/` (`TelephonyProvider` · Twilio · Telnyx · stub).

Apps and UI **never** call Twilio/Telnyx APIs directly.

---

## Body analogy (strategy)

| Metaphor | Role |
|----------|------|
| Brain | Understands what is happening |
| Eyes & ears | Connectors + inbound communications |
| Voice & hands | Outbound communications + actions |
| Memory | CRM, documents, conversations, history |
| Nervous system | Events + automation |
| Heart | Commerce / revenue |
| Command Centre | Operator attention |

Communications is a primary way the business interacts with the outside world.

---

## Build progression

### Live — Core Communications Email v1 (August 2026)

| Surface | Path | Status |
|---------|------|--------|
| **Core Communications home** | `/apps/communications` — Needs attention · Inbox preview · Quick actions · Recent activity | **Live** |
| **Core Communications nav** | Inbox · Email · SMS · Calls · Outreach · Templates · Signatures | **Live** (SMS/Calls/Outreach/Templates placeholders) |
| **Email channel** | `/apps/communications/email` → Compose · Sent · Scheduled · Mailboxes | **Live** |
| **Signature Studio v1** | `/apps/communications/signatures` · `organisation.settings.communications.signatures` · default appended on Compose | **Live** |
| **Connected Services (customer)** | `/dashboard/settings/connected-services` — human cards (Gmail · GBP · Microsoft coming next · Stripe · WordPress) | **Live** |
| **Gmail OAuth** | `/api/connectors/google-gmail/*` · Mailboxes Connect / Sync / Disconnect | **Live** (Google first; Microsoft next) |
| **Gmail sync** | Manual Sync + post-connect → `OrgCommunication` (provider `gmail`, source `mailbox`) · Contact match by email | **Live** |
| **Send API** | `/api/v1/communications/messages` | **Live** — Resend + OrgCommunication; optional `scheduledAt` |
| **Scheduled flush** | `/api/cron/scheduled-emails` (daily) + flush on Scheduled page open | **Live** |
| **CRM** | Contact → Email contact (Compose) · Timeline (universal history) — **no Email module under CRM** | **Live** |
| **Persistence** | Prisma `OrgCommunication` (`org_communications`, `scheduled_at`) | **Live** after `prisma db push` |

**IA lock:** Growth **AI Communications** soft-hidden from sidebar (`SIDEBAR_HIDDEN_APP_IDS`); Calls deep-links to voice tooling; history association is Core + CRM Timeline. Founding Mode still slims Growth via `org-apps.ts`.

**Deploy:**

```bash
cd packages/database && npx prisma db push
# or from repo root:
npm run db:push
```

Uploads/sends need `RESEND_API_KEY` on Vercel (existing transactional path).  
Gmail OAuth needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and redirect URI `…/api/connectors/google-gmail/callback` registered in Google Cloud Console (`GOOGLE_GMAIL_REDIRECT_URI` optional override).

**v1 scope shipped:** Organisation-scoped communication records · Communications home · manual compose · Send later / Scheduled · Sent + History · Signature Studio · Founding / referral provenance · Automations catalogue · **Gmail connect + sync into Inbox/History** · Connected Services customer page · Resend provider · Microsoft Mailboxes / Connected Services placeholder.

**Not yet:** Microsoft Graph OAuth · send-as-Gmail identity · AI Assist drafts · SMS/WhatsApp Live (TelephonyProvider scaffold: Twilio first · Telnyx evaluate) · Communication Health score · unsupervised agent send · multi-step drip sequencer UI · open/reply webhooks · classification → Priorities.

### Core — Communications Email v1 (remaining)

- OAuth Microsoft 365  
- Send as connected mailbox identity  
- AI Assist **draft-only** behind governance  

### Later

- SMS / WhatsApp as channels  
- Full drip / Outreach sequencer UI (Prospecting emits Communication records)  
- Deep open/reply intelligence + classification → Priorities  
- Merge voice/Call Centre timelines into History  
- AI Agent–proposed sends (#4) under governance  
- Templates library maturity  

### Explicitly out of scope for Email v1

- Building a full mail client competitor (folders, labels UX wars, offline MUA)  
- Replacing Google/Microsoft as mailbox SoT  
- Unsupervised AI auto-send to customers  
- Replacing Growth AI Communications voice product overnight  

---

## Commercial note

- **Core Communications** — foundation of the BOS (included with platform Core).  
- **AI Communications (Growth, ~$99)** — advanced AI employees / voice / high-volume generation.  
Do not double-charge for “having email history”; charge for AI depth and agent capacity.


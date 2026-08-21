# Voice Agent runbook — first live slice

**App:** AI Communications (`voice_ai` addon)  
**Provider:** ElevenLabs Conversational AI  
**Architecture:** [VOICE-AGENT-ARCHITECTURE.md](./VOICE-AGENT-ARCHITECTURE.md)  
**Last updated:** August 2026

**Principle:** ElevenLabs provides the voice intelligence; DigitalGate remains the system of record.

Related: [COMMUNICATIONS-ARCHITECTURE.md](./COMMUNICATIONS-ARCHITECTURE.md)

---

## 1. Environment

Set on Vercel (Production + Preview) and local `.env.local`:

| Variable | Purpose |
|----------|---------|
| `ELEVENLABS_API_KEY` | ConvAI + voices API |
| `ELEVENLABS_WEBHOOK_SECRET` | HMAC for post-call webhook — **must be the `wsec_…` secret ElevenLabs returns when the workspace webhook is created** (not a homemade random string) |
| `ELEVENLABS_TOOL_SECRET` | Bearer token registered on tool webhooks at publish time |
| `NEXT_PUBLIC_APP_URL` | Public origin ElevenLabs can reach — production must be `https://app.digitalgate.com.au` |

Never use `NEXT_PUBLIC_` for secrets. Redeploy after changing Vercel env.

Confirm in **Apps → AI Communications → Settings**: API key Configured, Connection Reachable.

```bash
node --env-file=.env.local scripts/voice-agent-health.mjs --smoke-tools
```

Expect: voices > 0, `convaiSettings.postCallWebhookId` set, `toolSmoke.ok: true`.

---

## 2. Create & publish the receptionist

1. Open **Agent Builder** (`/apps/ai-communications/agents`) or run:
   `node --env-file=.env.local scripts/seed-voice-receptionist.mjs --publish`
   (uses production tool URLs when `NEXT_PUBLIC_APP_URL=https://app.digitalgate.com.au`)
2. Template: **Inbound Receptionist** — Contact / Opportunity / Task / SMS / Email / Transfer tools (grouped Understand · Record · Communicate · Escalate).
3. Pick a voice from the live list (UI) or accept provider default (seed).
4. Greeting supports `{{business_name}}` / `{{agent_name}}` — resolved from Business Profile on publish.
5. **Save & publish** registers tool URLs:
   `{APP_URL}/api/webhooks/elevenlabs/tools?agentId=<dgAgentId>&tool=<toolName>`

English agents must use TTS `eleven_flash_v2` or turbo v2 (not v2.5).

---

## 3. ElevenLabs dashboard / API

Workspace post-call webhook should point at:

`https://app.digitalgate.com.au/api/webhooks/elevenlabs`

Attach it under ConvAI settings (`post_call_webhook_id`) with events `["transcript"]`.

Then:

1. Open the published agent in ElevenLabs → **test widget** (phone optional).
2. Confirm DigitalGate `providerAgentId` matches the ElevenLabs agent id.

---

## 4. End-to-end checklist

- [ ] Test call / widget conversation completes
- [ ] Mid-call tools create/update Contact / Opportunity / Task in CRM (search before create)
- [ ] **Call Centre** shows session with transcript/summary
- [ ] Settings usage / overview increments

If tools **401**: Vercel `ELEVENLABS_TOOL_SECRET` must match the value used at publish (re-publish after rotating).  
If post-call **401**: Vercel `ELEVENLABS_WEBHOOK_SECRET` must be the ElevenLabs `wsec_…` secret.  
If session ignored: agent `providerAgentId` must match webhook `agent_id`.

---

## 5. Ops scripts

```bash
# Health + voices (+ optional production tool smoke)
node --env-file=.env.local scripts/voice-agent-health.mjs
node --env-file=.env.local scripts/voice-agent-health.mjs --smoke-tools

# Create + publish receptionist (production tool URLs)
NEXT_PUBLIC_APP_URL=https://app.digitalgate.com.au \
  node --env-file=.env.local scripts/seed-voice-receptionist.mjs --publish
```

---

## Out of scope (this slice)

- Twilio number buy / SMS delivery path end-to-end
- Real telephony transfer
- Calendar booking tools
- Full Business Brain document retrieval (authorised Profile context is Live; deeper Brain is Direction)
- Property Industry vendor-lead template

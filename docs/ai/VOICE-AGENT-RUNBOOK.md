# Voice Agent runbook — first live slice

**App:** AI Communications (`voice_ai` addon)  
**Provider:** ElevenLabs Conversational AI  
**Last updated:** August 2026

Related: [COMMUNICATIONS-ARCHITECTURE.md](./COMMUNICATIONS-ARCHITECTURE.md)

---

## 1. Environment

Set on Vercel (Production + Preview) and local `.env.local`:

| Variable | Purpose |
|----------|---------|
| `ELEVENLABS_API_KEY` | ConvAI + voices API |
| `ELEVENLABS_WEBHOOK_SECRET` | HMAC verify for post-call webhook |
| `ELEVENLABS_TOOL_SECRET` | Bearer token ElevenLabs sends to tool webhooks |
| `NEXT_PUBLIC_APP_URL` | Public origin ElevenLabs can reach (e.g. `https://app.digitalgate.com.au`) |

Never use `NEXT_PUBLIC_` for secrets. Redeploy after changing Vercel env.

Confirm in **Apps → AI Communications → Settings**: API key Configured, Connection Reachable.

Smoke test: `GET /api/v1/communications/voices` returns real voices (not stub).

---

## 2. Create & publish the receptionist

1. Open **Agent Builder** (`/apps/ai-communications/agents`).
2. Click **Inbound receptionist** template (tools include Contact + Opportunity + Task).
3. Pick a voice from the live list.
4. **Save & publish** — DigitalGate creates/updates the ElevenLabs agent and registers tool URLs:
   `{APP_URL}/api/webhooks/elevenlabs/tools?agentId=<dgAgentId>&tool=<toolName>`

---

## 3. ElevenLabs dashboard

1. Open the published agent in ElevenLabs ConvAI.
2. Set **post-call webhook** to:
   `{APP_URL}/api/webhooks/elevenlabs`
   using the same `ELEVENLABS_WEBHOOK_SECRET`.
3. Use the **test widget** for the first proof (phone number optional).
4. Confirm `providerAgentId` on the DigitalGate agent matches the ElevenLabs agent id (shown after publish / in Voice list).

---

## 4. End-to-end checklist

- [ ] Test call / widget conversation completes
- [ ] Mid-call tools create Contact / Opportunity / Task in CRM
- [ ] **Call Centre** shows session with transcript/summary
- [ ] Settings usage / overview increments

If tools 401: check `ELEVENLABS_TOOL_SECRET` matches what was registered at publish (re-publish after rotating).  
If post-call 401: check `ELEVENLABS_WEBHOOK_SECRET` and signature header.  
If session ignored: agent `providerAgentId` must match webhook `agent_id`.

---

## 5. Ops scripts

```bash
# Health + voices (requires ELEVENLABS_API_KEY)
node --env-file=.env.local scripts/voice-agent-health.mjs

# Create + publish receptionist for DigitalGate org (optional --publish)
node --env-file=.env.local scripts/seed-voice-receptionist.mjs --publish
```

---

## Out of scope (this slice)

- Twilio number buy / SMS
- Real telephony transfer
- Calendar booking tools
- Property Industry vendor-lead template

# Public DeepSeek and dg-fast worker activation procedure

Status: **repository preparation only. No provider, worker, launchd service, Production environment, migration or customer data is activated by this document.**

This procedure extends the existing Model Router and AI Gateway Slice 3 boundary. It does not create a second AI architecture.

## 1. DeepSeek — public Aida only

DeepSeek is an optional OpenAI-compatible transport for **public Aida** (public website knowledge and public product/pricing retrieval). It is not a tenant, CRM, Business Brain, support-conversation or internal Advisor provider.

### Code contract

- `llmChat` only includes DeepSeek when the caller passes `publicDataOnly: true`.
- Public Aida is the only caller that passes this scope.
- The default internal transport plan excludes DeepSeek even when `DEEPSEEK_API_KEY` is present.
- The AI Gateway's tenant-confidential recipient policy remains unchanged: only its explicitly approved direct recipient is admissible. DeepSeek is not an `AiRecipient`.
- Provider/model errors use `safeErrors: true` on the public path. No provider body is returned to the visitor.
- Request, worker and tenant data are not shared with DeepSeek by this change.

### Configuration (not activated here)

Set these only in the approved environment after the data-protection and provider approval is recorded:

| Variable | Required | Meaning |
|---|---|---|
| `DEEPSEEK_API_KEY` | yes for this transport | Secret API key. Never client-side, logged or committed. |
| `DEEPSEEK_MODEL` | no | Defaults to `deepseek-chat`. |
| `DEEPSEEK_BASE_URL` | no | Defaults to `https://api.deepseek.com`; must be HTTPS without credentials, query or fragment. |

If the key is absent, the public path continues with the existing Gateway/Anthropic/OpenAI failover chain. If the key is present but the base URL is invalid or non-HTTPS, DeepSeek is disabled and no request is made.

### Verification before activation

```sh
npm run test:ai-deepseek-public
npm run test:ai-gateway-policy
npm run test:ai-gateway
npm run test:aida-public-advisor
npx tsc --noEmit
```

Required assertions:

- DeepSeek is absent from `resolveLlmTransports("standard")`.
- DeepSeek is present only in the explicit public-data scope.
- An internal caller naming `"deepseek"` alone receives no-provider failure and makes zero fetch calls.
- Public Aida sends `publicDataOnly: true`.
- Invalid/non-HTTPS base URL fails closed.
- No tenant/Business Brain payload reaches DeepSeek.
- The AI Gateway model variables must never be set to a DeepSeek upstream; DeepSeek is not an approved gateway recipient.

### Activation and rollback

1. Obtain explicit owner/data-protection approval for the public-data provider and retention/training terms.
2. Add `DEEPSEEK_API_KEY` only to the approved environment; keep the existing cloud providers configured.
3. Deploy through the normal reviewed release path. Do not auto-deploy.
4. Run one public Aida smoke request and verify the selected provider/model in safe telemetry, not prompt/response bodies.
5. Roll back by removing `DEEPSEEK_API_KEY` and redeploying. No database migration, tenant approval or customer entitlement change is involved.

## 2. Existing dg-fast Mac worker

This is the existing Slice 3 worker, not a new service. Follow `docs/ai/AI-GATEWAY-SLICE-3-RUNBOOK.md` for the full security controls; the checkpoints below are the isolated activation gate.

### Preconditions

- The approved `dg-fast:latest` Qwen3.5 9B Q4_K_M model is installed; verify the Ollama tag digest matches the pinned value.
- Node 24 or newer is installed.
- The signed provisioning window and helpers are prepared as described in the Slice 3 runbook.
- The worker credential is in the current user's Keychain under service `com.digitalgate.ai-worker`, account `dg-mac-1`.
- No Production database URL, database password or cloud encryption key is present on the Mac.
- A tenant owner/admin has approved the exact local deployment for the intended classification.
- Worker provisioning is disabled outside the approved window.

### Launchd installation

Use the checked-in template `workers/mac-ai/launchd/com.digitalgate.ai-worker.plist.example`. Copy it to the operator's `~/Library/LaunchAgents/`, replace only the documented placeholders, and keep the file mode restricted to the owner.

The plist must contain only non-secret configuration:

- absolute Node 24 path;
- absolute repository worker path;
- working directory;
- `DG_AI_GATEWAY_URL=https://app.digitalgate.com.au`;
- `DG_AI_WORKER_ID=dg-mac-1`;
- `DG_FAST_OLLAMA_DIGEST=bb416f08...` (bare Ollama digest; do not add a `sha256:` prefix; the worker compares the pinned server value verbatim);
- bounded log paths.

It must not contain a worker bearer, database URL, encryption key, provisioning public key, API key or shell profile.

```sh
mkdir -p "$HOME/Library/Logs/DigitalGate"
plutil -lint "$HOME/Library/LaunchAgents/com.digitalgate.ai-worker.plist"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.digitalgate.ai-worker.plist"
launchctl print "gui/$(id -u)/com.digitalgate.ai-worker"
```

The worker opens no listening port and does not change Ollama's bind address. Do not run `launchctl` until the separate activation approval is recorded.

### Operational smoke

1. Confirm the launchd job is running as the intended user.
2. Confirm the worker polls the HTTPS claim endpoint and heartbeat path.
3. Submit one synthetic, approved routine job through the existing queue; verify the encrypted job, lease, result and outbox/ledger path.
4. Confirm the model digest and `dg-fast:latest` profile in safe metadata.
5. Confirm no credential or prompt/result body appears in logs.
6. Confirm a denied deployment/approval fails closed.

### Rollback

```sh
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.digitalgate.ai-worker.plist"
```

Then revoke the local recipient approval and, if required, the pinned worker credential through the existing authorised revocation/rotation process. Do not delete audit/ledger history. Draining or cancelling in-flight work must follow the existing lease/job rules.

## 3. Local/cloud failover objective

- Public Aida keeps explicit cloud failover and may use DeepSeek only in the public-data scope after approval.
- The dg-fast worker remains the asynchronous local routine lane for approved background work.
- Do not force asynchronous local jobs into synchronous Aida chat.
- Any future local Aida task needs a separate bounded task/result contract, visible status UX and its own approval; this document does not create one.
- Local-required/restricted data never falls back to cloud. Cloud tenant data never falls through to DeepSeek.

## 4. Current evidence limits

- No DeepSeek key is configured in this repository or environment.
- No launchd plist is installed by this change.
- No worker, provider, migration, Production configuration or customer entitlement is activated.
- Hosted public-Aida acceptance, provider terms review and worker smoke require separate approval.

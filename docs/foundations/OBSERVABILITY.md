# Observability

**Visibility into the platform — for debugging and proactive support**

Observability serves **engineering** (fix issues) and **customer success** (prevent issues). Command Centre surfaces operational metrics; engineering uses deeper tooling.

---

## What to track

| Signal | Purpose | Tool (initial → scale) |
|--------|---------|------------------------|
| **API performance** | Latency, throughput, error rate | Vercel Analytics → Datadog |
| **Errors** | Unhandled exceptions, 5xx | Sentry |
| **Failed automations** | Trigger fired, action failed | Event bus + alert table |
| **AI usage** | Tokens, cost, latency per org | AI Service log → Command Centre |
| **Queue health** | Backlog, dead letters | Inngest dashboard (1.5+) |
| **Connector status** | Last sync, error count | Connector heartbeat |
| **Database** | Connection pool, slow queries | Neon metrics |
| **Auth** | Failed logins, webhook failures | Clerk dashboard + logs |

---

## Structured logging

Every server log line includes:

```
organisationId (if applicable)
requestId
userId (if applicable)
appId (if applicable)
durationMs
```

**Never log:** passwords, API keys, full PII in production logs.

---

## Connector health

Each Connector reports:

```typescript
ConnectorStatus {
  organisationId
  connectorId        // wordpress, stripe, google
  status: "healthy" | "degraded" | "failed"
  lastSyncAt
  lastError?
  consecutiveFailures
}
```

Command Centre → Support Centre shows failed connectors before customer complains.

---

## Automation observability

```typescript
AutomationRun {
  id
  organisationId
  automationId
  triggerEvent
  status: "success" | "failed" | "skipped"
  error?
  durationMs
  ranAt
}
```

Failed runs → retry policy → alert after N failures.

---

## AI observability

```typescript
AiUsageLog {
  organisationId
  userId?
  toolId
  model
  inputTokens
  outputTokens
  costCents
  latencyMs
  success
  occurredAt
}
```

Feeds billing meters and Command Centre AI analytics.

---

## Customer-facing status

| Surface | Content |
|---------|---------|
| **Status page** | status.digitalgate.com.au — platform incidents |
| **In-app banner** | Degraded connector or known incident |
| **Command Centre** | Full platform health dashboard |

---

## Alerting tiers

| Tier | Response | Example |
|------|----------|---------|
| P1 | Page on-call | API down, data breach |
| P2 | Slack alert | Error rate > 1% |
| P3 | Daily digest | Slow query trend |
| P4 | Command Centre only | Single connector failure |

---

## Phase plan

| Phase | Deliverable |
|-------|-------------|
| **1.0** | Sentry + Vercel logs; basic API error tracking |
| **1.5** | Connector heartbeat; automation run log |
| **2.0** | Command Centre Platform Health module live |
| **3.0** | Full Datadog / equivalent; SLOs published |

---

## Related

- [COMMAND-CENTRE.md](../COMMAND-CENTRE.md) — Platform Health module  
- [CUSTOMER-SUCCESS.md](./CUSTOMER-SUCCESS.md) — proactive alerts  

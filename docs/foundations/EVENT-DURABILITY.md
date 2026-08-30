# Event durability — assessment and decision

**Decision: DigitalGate does not need a transactional outbox today.** This
records the evidence, so the question does not get re-litigated from intuition,
and states the conditions that would change the answer.

## What was measured

A full census of `packages/platform-core` and `src`, not a sample:

| Metric | Count |
|---|---|
| `platformEvents.publish(...)` call sites | 41 |
| Distinct published event types | ~38 |
| Production subscribers | 3 (automation dispatch, notification fan-out, dev-only debug log) |
| Registered automation rules | 5 |
| Published types with **no** production handler | ~25 |
| Publishes inside a database transaction | **0** |
| Publishes before the primary commit | **0** |
| Handlers whose loss is unrecoverable | **0** |

## Why an outbox is not warranted

An outbox exists to stop *database state* and *the intent to publish* from
diverging. That divergence only matters when losing the event loses something
that cannot be reconstructed. Here, it cannot:

- **Money never depends on the bus.** `CommercePayment` rows, referral ledger
  entries and Stripe Connect transfers are all committed *before* the
  corresponding event is published. Losing the event loses a notification, not
  a payment.
- **Every publish happens after its primary commit.** There is no path where an
  event fires and the business write is then rolled back, which is the failure
  an outbox prevents.
- **Roughly 25 of ~38 event types have no production handler at all.** They are
  telemetry.
- **The handlers that do work are recoverable.** Lead-intake acknowledgement
  email and follow-up task creation are the only customer-visible effects; the
  lead row, activity and audit entry all survive independently, and the operator
  can resend. Everything else writes in-app notifications or tasks.
- **Durable delivery already exists where it matters** and deliberately does not
  use the bus: `OrgCommunication` plus the scheduled-email cron, the lead
  follow-up crons, and `StripeWebhookReceipt` for webhook idempotency.

Building an outbox now would add a table, a worker, a retry policy and a
dead-letter path to protect work that is either cosmetic or already recoverable.

## Known weaknesses accepted for now

These are real, and they are the honest cost of the decision:

1. **Handler failures are swallowed.** `EventBus.publish` catches per handler and
   logs (`packages/platform-core/src/events/bus.ts`). A failed acknowledgement
   email is invisible except in logs.
2. **No idempotency on replay.** The notification fan-out and the intake
   acknowledgement email have no dedup key, so a duplicate publish sends a
   duplicate email. Today nothing replays events, so this is latent.
3. **Handlers run inline on the request path.** They are awaited before the HTTP
   response, which adds latency to public capture endpoints and webhooks. It
   also means a process kill mid-handler loses that handler's work — the same
   class of gap as H-7's residual crash case.
4. **`opportunity.won` has a subscriber but is never published** — dead wiring.

## What would change the decision

Adopt a durable queue, and then an outbox, when any of these becomes true:

- An event handler becomes the only thing that moves money, sends a contractual
  commitment, or writes a compliance record.
- Automation moves off the request thread — deferring work without durability
  converts today's latency cost into silent loss.
- Multiple consumers need at-least-once delivery, which requires consumer-side
  idempotency keys first.
- Handler volume makes inline execution unacceptable on public capture paths.

The sequencing matters: the first step is a **queue plus consumer idempotency**,
not an outbox. An outbox is only needed once commit-and-publish atomicity is
genuinely required — which is precisely what the current design avoids by
committing money before publishing.

`docs/adr/` already records the intent to migrate to a durable queue at scale;
this document supplies the evidence for why "at scale" has not arrived.

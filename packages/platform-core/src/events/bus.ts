import type { EventHandler, PlatformEvent } from "./types";

/**
 * In-process event bus. Replace with durable queue (Inngest, SQS) at scale.
 */
export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  subscribe(type: string, handler: EventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  unsubscribe(type: string, handler: EventHandler) {
    this.handlers.get(type)?.delete(handler);
  }

  async publish(event: PlatformEvent) {
    const specific = this.handlers.get(event.type) ?? new Set();
    const wildcard = this.handlers.get("*") ?? new Set();
    const all = [...specific, ...wildcard];

    await Promise.all(
      all.map(async (handler) => {
        try {
          await handler(event);
        } catch (err) {
          console.error(`[EventBus] handler failed for ${event.type}:`, err);
        }
      }),
    );
  }
}

export const platformEvents = new EventBus();

/** Log all events in development */
if (process.env.NODE_ENV === "development") {
  platformEvents.subscribe("*", (event) => {
    console.debug("[EventBus]", event.type, event.entityType, event.entityId);
  });
}

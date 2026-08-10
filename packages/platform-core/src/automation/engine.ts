import { createActivity } from "../activities";
import type { PlatformEvent, PlatformEventType } from "../events/types";

export type AutomationActionHandler = (
  event: PlatformEvent,
  config?: Record<string, unknown>,
) => void | Promise<void>;

type RegisteredRule = {
  id: string;
  trigger: PlatformEventType;
  action: string;
  handler: AutomationActionHandler;
  enabled: boolean;
};

const rules: RegisteredRule[] = [];

/** Register a handler for a platform event type (in-process Phase 1 automation). */
export function registerAutomationRule(rule: Omit<RegisteredRule, "enabled"> & {
  enabled?: boolean;
}) {
  rules.push({ ...rule, enabled: rule.enabled ?? true });
}

export function listAutomationRules() {
  return rules.map(({ handler: _h, ...rest }) => rest);
}

/** Execute matching automation rules for an event. */
export async function runAutomationForEvent(event: PlatformEvent) {
  const matched = rules.filter((r) => r.enabled && r.trigger === event.type);
  const results: Array<{ ruleId: string; ok: boolean; error?: string }> = [];

  for (const rule of matched) {
    try {
      await rule.handler(event);
      results.push({ ruleId: rule.id, ok: true });
    } catch (err) {
      results.push({
        ruleId: rule.id,
        ok: false,
        error: err instanceof Error ? err.message : "automation failed",
      });
    }
  }

  if (event.organisationId && matched.length > 0) {
    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    try {
      await createActivity({
        organisationId: event.organisationId,
        entityType: event.entityType || "Event",
        entityId: event.entityId || event.type,
        activityType: failCount > 0 ? "automation.run_partial" : "automation.run",
        title: `Automation · ${event.type} (${okCount}/${results.length} ok)`,
        body: results
          .map((r) => `${r.ruleId}: ${r.ok ? "ok" : r.error ?? "failed"}`)
          .join("\n"),
        sourceApp: "automation",
        metadata: {
          eventType: event.type,
          results,
        },
      });
    } catch {
      // Never block event path on log write
    }
  }

  return results;
}

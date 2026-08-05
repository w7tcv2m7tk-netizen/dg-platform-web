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

  return results;
}

import { registerAutomationRule } from "./engine";

/** Wire default cross-app automations (expand via manifest triggers). */
export function bootDefaultAutomations() {
  if ((globalThis as { __dgAutomationBooted?: boolean }).__dgAutomationBooted) {
    return;
  }
  (globalThis as { __dgAutomationBooted?: boolean }).__dgAutomationBooted = true;

  registerAutomationRule({
    id: "commerce.payment.completed.log",
    trigger: "commerce.payment.completed",
    action: "log_payment_completed",
    handler: async (event) => {
      console.info("[automation] payment completed", {
        organisationId: event.organisationId,
        entityId: event.entityId,
        payload: event.payload,
      });
    },
  });

  registerAutomationRule({
    id: "commerce.quote.accepted.log",
    trigger: "commerce.quote.accepted",
    action: "log_quote_accepted",
    handler: async (event) => {
      console.info("[automation] quote accepted", {
        organisationId: event.organisationId,
        payload: event.payload,
      });
    },
  });
}

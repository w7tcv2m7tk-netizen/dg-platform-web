import type { Prisma } from "@dg/database";
import { platformEvents, type PlatformEvent } from "./events";

/** CRM helpers share the caller's connection and defer event handlers until commit. */
export interface CrmTransactionContext {
  db: Prisma.TransactionClient;
  events: PlatformEvent[];
}

export async function publishCrmEvent(event: PlatformEvent, context?: CrmTransactionContext) {
  if (context) context.events.push(event);
  else await platformEvents.publish(event);
}

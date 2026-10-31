import { PrismaClient } from "@prisma/client";
import { databaseLogger } from "./safe-logging";

function createSharedClient() {
  const logger = databaseLogger;
  const client = new PrismaClient({
    log: [{ emit: "event", level: "error" }, { emit: "event", level: "warn" }],
  });
  // Native events have no reliable request identity. Ignore their entire payload.
  client.$on("error", logger.engineError);
  client.$on("warn", logger.engineWarning);
  // Query-only observation leaves model arguments/results unchanged. Preserve the
  // generated public client type for existing injected-client/transaction callers;
  // forward $on through the supported client extension component.
  return client.$extends({
    name: "safe-database-observability",
    client: { $on: client.$on.bind(client) },
    query: {
      async $allOperations({ args, query }) {
        try { return await query(args); }
        catch (error) { logger.operationFailure(error); throw error; }
      },
    },
  }) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createSharedClient> | undefined;
};
export const prisma = globalForPrisma.prisma ?? createSharedClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export * from "@prisma/client";

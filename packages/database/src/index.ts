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
  const extended = client.$extends({
    name: "safe-database-observability",
    query: {
      async $allOperations({ args, query }) {
        try { return await query(args); }
        catch (error) { logger.operationFailure(error); throw error; }
      },
    },
  });
  // Extended clients hide $on. Preserve the existing public client contract
  // without replacing or reconfiguring Prisma's proxy target.
  const on = client.$on.bind(client);
  return new Proxy({ $on: on }, {
    get(target, property, receiver) {
      if (Object.hasOwn(target, property)) return Reflect.get(target, property, receiver);
      const value = Reflect.get(extended as object, property, extended);
      return typeof value === "function" ? value.bind(extended) : value;
    },
  }) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createSharedClient> | undefined;
};
export const prisma = globalForPrisma.prisma ?? createSharedClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export * from "@prisma/client";

import { revokeAiWorker } from "@dg/platform-core";

const [workerId] = process.argv.slice(2);
if (!process.env.DATABASE_URL || !workerId) {
  console.error("Usage: node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/revoke-ai-local-worker.mjs <worker-id>");
  process.exitCode = 2;
} else {
  await revokeAiWorker(workerId);
  process.stdout.write("Worker revoked.\n");
}

import { provisionAiLocalWorker } from "@dg/platform-core";

const [name, modelDigest] = process.argv.slice(2);
if (!process.env.DATABASE_URL || !name || !modelDigest) {
  console.error("Usage: node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/provision-ai-local-worker.mjs <worker-name> <ollama-digest>");
  process.exitCode = 2;
} else {
  const provisioned = await provisionAiLocalWorker({ name, modelDigest });
  // The credential is emitted once for controlled provisioning into the Mac Keychain.
  process.stdout.write(`${JSON.stringify(provisioned)}\n`);
}

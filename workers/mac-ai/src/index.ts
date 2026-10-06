import { readConfig, readKeychainCredential } from "./config.ts";
import { GatewayClient } from "./client.ts";
import { MacAiWorker } from "./worker.ts";

const config = readConfig();
const credential = readKeychainCredential(config.workerId);
const worker = new MacAiWorker(config, new GatewayClient(config, credential));
process.once("SIGINT", () => worker.stop());
process.once("SIGTERM", () => worker.stop());
await worker.run();

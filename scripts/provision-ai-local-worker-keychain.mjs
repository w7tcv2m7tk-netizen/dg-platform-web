import { cloudWorkerSetup } from "./mac-worker-provisioning-client.mjs";
const [mode, workerId, ...extra] = process.argv.slice(2);
if (process.platform !== "darwin" || extra.length) {
  process.stderr.write("Use on the intended Mac: provision OR recover <existing-worker-id>\n");
  process.exitCode = 2;
} else {
  process.exitCode = await cloudWorkerSetup({ mode, workerId });
}

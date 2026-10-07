import { keychainCall, secureWorkerSetup } from "./mac-worker-keychain.mjs";

const [mode, workerId, ...extra] = process.argv.slice(2);
if (process.platform !== "darwin" || !process.env.DATABASE_URL || extra.length ||
    !((mode === "provision" && !workerId) || (mode === "recover" && workerId))) {
  process.stderr.write("Use on the intended Mac: provision OR recover <existing-worker-id>; DATABASE_URL required\n");
  process.exitCode = 2;
} else {
  // Imports and database errors are deliberately never rendered.
  try {
    const { provisionAiLocalWorker, rotateAiWorkerCredential } = await import("../packages/platform-core/src/ai/local-worker-auth.ts");
    const { prisma } = await import("@dg/database");
    process.exitCode = await secureWorkerSetup({ mode, workerId }, {
      provision: provisionAiLocalWorker,
      rotate: rotateAiWorkerCredential,
      preflight: () => keychainCall("--check"),
      install: keychainCall,
      findExisting: async (name, id) => {
        const workers = await prisma.aiWorkerPrincipal.findMany({ where: { name }, select: { id: true, revokedAt: true }, take: 2 });
        if (!id) return workers.length !== 0;
        if (workers.length !== 1 || workers[0].id !== id || workers[0].revokedAt) return null;
        const deployments = await prisma.aiLocalDeployment.findMany({ where: { workerId: id, name,
          modelId: "dg-fast:latest", modelDigest: "bb416f08ee253472fdb015ecc32db5ad8fbf0baf76226781fb62b711835c0f7d",
          lane: "local_routine", endpointKind: "ollama_loopback" }, select: { id: true }, take: 2 });
        return deployments.length === 1 ? { workerId: id, deploymentId: deployments[0].id } : null;
      },
      output: (metadata) => process.stdout.write(`${JSON.stringify(metadata)}\n`),
    });
    await prisma.$disconnect();
  } catch {
    process.stderr.write("Secure provisioning stopped; inspect dg-mac-1 records before any retry\n");
    process.exitCode = 1;
  }
}

// Fixed event schema only. No request objects, headers, bodies, signatures or errors.
export function provisioningAudit(event: "attempt" | "outcome", outcome: "disabled" | "unauthorized" | "verified" | "succeeded" | "rejected" | "unavailable", identity?: { fingerprint: string; requestId: string; operation: "provision" | "recover"; workerId?: string; deploymentId?: string }, emit: (metadata: object) => void = metadata => console.info(JSON.stringify(metadata))) {
  const safe = identity && /^[a-f0-9]{64}$/.test(identity.fingerprint) && /^[a-f0-9]{64}$/.test(identity.requestId) && ["provision", "recover"].includes(identity.operation) ? {
    fingerprint: identity.fingerprint, requestId: identity.requestId, operation: identity.operation,
    ...(identity.workerId && !identity.workerId.startsWith("dgw_") && /^[A-Za-z0-9_-]{1,120}$/.test(identity.workerId) ? { workerId: identity.workerId } : {}),
    ...(identity.deploymentId && !identity.deploymentId.startsWith("dgw_") && /^[A-Za-z0-9_-]{1,120}$/.test(identity.deploymentId) ? { deploymentId: identity.deploymentId } : {}),
  } : {};
  emit({ eventType: `ai_worker_provisioning_${event}`, outcome, ...safe, timestamp: new Date().toISOString() });
}

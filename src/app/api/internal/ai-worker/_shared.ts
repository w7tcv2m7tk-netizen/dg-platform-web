import { NextResponse } from "next/server";
import { authenticateAiWorker, type AuthenticatedAiWorker } from "@dg/platform-core";

export async function workerForRequest(req: Request): Promise<AuthenticatedAiWorker | NextResponse> {
  if (process.env.NODE_ENV === "production" && req.headers.get("x-forwarded-proto") !== "https") {
    return NextResponse.json({ error: { code: "https_required" } }, { status: 400 });
  }
  const worker = await authenticateAiWorker(req);
  if (!worker) return NextResponse.json({ error: { code: "worker_unauthorized" } }, { status: 401 });
  return worker;
}

export function isResponse(value: AuthenticatedAiWorker | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export async function boundedJson(req: Request, maxBytes = 32_000): Promise<Record<string, unknown> | null> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > maxBytes) return null;
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } catch { return null; }
  const text = new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
  try {
    const body = JSON.parse(text) as unknown;
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch { return null; }
}

export function workerError(error: unknown) {
  const raw = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
  const allowed = ["lease_invalid", "claim_operation_replayed", "completion_conflict", "invalid_worker_operation", "invalid_result", "model_identity_mismatch"];
  const code = allowed.includes(raw) ? raw : "worker_request_failed";
  const status = ["lease_invalid", "claim_operation_replayed", "completion_conflict"].includes(code) ? 409 : 400;
  return NextResponse.json({ error: { code } }, { status });
}

import { completeAiLocalJob } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { boundedJson, isResponse, workerError, workerForRequest } from "../_shared";

export async function POST(req: Request) {
  const worker = await workerForRequest(req);
  if (isResponse(worker)) return worker;
  const body = await boundedJson(req, 100_000);
  if (!body || typeof body.jobId !== "string" || typeof body.leaseToken !== "string" ||
      typeof body.generation !== "number" || typeof body.operationId !== "string" ||
      (body.outcome !== "succeeded" && body.outcome !== "failed") ||
      (body.outcome === "succeeded" && (typeof body.modelId !== "string" || typeof body.modelDigest !== "string")) ||
      (body.outcome === "failed" && typeof body.failureCode !== "string")) {
    return NextResponse.json({ error: { code: "invalid_request" } }, { status: 400 });
  }
  try { return NextResponse.json({ data: await completeAiLocalJob(worker, { jobId: body.jobId, leaseToken: body.leaseToken,
    generation: body.generation, operationId: body.operationId, outcome: body.outcome,
    ...(typeof body.text === "string" ? { text: body.text } : {}),
    ...(typeof body.modelId === "string" ? { modelId: body.modelId } : {}),
    ...(typeof body.modelDigest === "string" ? { modelDigest: body.modelDigest } : {}),
    ...(typeof body.failureCode === "string" ? { failureCode: body.failureCode as "ollama_unavailable" | "model_identity_mismatch" | "invalid_output" | "inference_timeout" | "inference_failed" } : {}),
    tokensIn: body.tokensIn, tokensOut: body.tokensOut, retryable: body.retryable === true }) }); }
  catch (error) { return workerError(error); }
}

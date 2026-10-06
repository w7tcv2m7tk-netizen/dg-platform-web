import { heartbeatAiLocalJob } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { boundedJson, isResponse, workerError, workerForRequest } from "../_shared";

export async function POST(req: Request) {
  const worker = await workerForRequest(req);
  if (isResponse(worker)) return worker;
  const body = await boundedJson(req, 2_000);
  if (!body || typeof body.jobId !== "string" || typeof body.leaseToken !== "string" ||
      typeof body.generation !== "number" || typeof body.operationId !== "string" || typeof body.sequence !== "number") {
    return NextResponse.json({ error: { code: "invalid_request" } }, { status: 400 });
  }
  try { return NextResponse.json({ data: await heartbeatAiLocalJob(worker, { jobId: body.jobId, leaseToken: body.leaseToken,
    generation: body.generation, operationId: body.operationId, sequence: body.sequence }) }); }
  catch (error) { return workerError(error); }
}

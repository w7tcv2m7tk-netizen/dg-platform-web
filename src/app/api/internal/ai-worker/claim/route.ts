import { claimAiLocalJob } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { boundedJson, isResponse, workerError, workerForRequest } from "../_shared";

export async function POST(req: Request) {
  const worker = await workerForRequest(req);
  if (isResponse(worker)) return worker;
  const body = await boundedJson(req, 2_000);
  if (!body || typeof body.operationId !== "string" || typeof body.requestTimestamp !== "number") return NextResponse.json({ error: { code: "invalid_request" } }, { status: 400 });
  try {
    const job = await claimAiLocalJob(worker, { operationId: body.operationId, requestTimestamp: body.requestTimestamp });
    return NextResponse.json({ data: job }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) { return workerError(error); }
}

import { NextResponse } from "next/server";
import { getApiBase, pingApi } from "@/lib/dg-api";

export async function GET() {
  const api = await pingApi();
  return NextResponse.json({
    status: "ok",
    app: "dg-platform-web",
    dgApi: api,
    apiBase: getApiBase(),
  });
}

import {
  archiveProduct,
  createProduct,
  listProducts,
  updateProduct,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("includeInactive") === "1";
  const products = await listProducts(session.organisationId, { includeInactive });
  return NextResponse.json({ data: products });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "name required" } },
      { status: 422 },
    );
  }

  const unitAmount =
    typeof body?.unitAmountCents === "number"
      ? body.unitAmountCents
      : Math.round((parseFloat(String(body?.unitAmount ?? "0")) || 0) * 100);

  try {
    const product = await createProduct({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      name,
      description: typeof body?.description === "string" ? body.description : undefined,
      sku: typeof body?.sku === "string" ? body.sku : undefined,
      unitAmountCents: unitAmount,
      currency: typeof body?.currency === "string" ? body.currency : "AUD",
      taxCode: typeof body?.taxCode === "string" ? body.taxCode : undefined,
      taxRateBps:
        typeof body?.taxRateBps === "number"
          ? body.taxRateBps
          : body?.applyGst === true
            ? 1000
            : body?.applyGst === false
              ? 0
              : undefined,
      active: body?.active !== false,
    });
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: err instanceof Error ? err.message : "Could not create product",
        },
      },
      { status: 422 },
    );
  }
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const productId = typeof body?.id === "string" ? body.id : "";
  if (!productId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "id required" } },
      { status: 422 },
    );
  }

  if (body?.archive === true) {
    try {
      const product = await archiveProduct({
        organisationId: session.organisationId,
        productId,
        actorId: session.clerkUserId,
      });
      return NextResponse.json({ data: product });
    } catch (err) {
      return NextResponse.json(
        {
          error: {
            code: "not_found",
            message: err instanceof Error ? err.message : "Product not found",
          },
        },
        { status: 404 },
      );
    }
  }

  try {
    const product = await updateProduct({
      organisationId: session.organisationId,
      productId,
      actorId: session.clerkUserId,
      name: typeof body?.name === "string" ? body.name : undefined,
      description:
        body?.description === null
          ? null
          : typeof body?.description === "string"
            ? body.description
            : undefined,
      sku:
        body?.sku === null
          ? null
          : typeof body?.sku === "string"
            ? body.sku
            : undefined,
      unitAmountCents:
        typeof body?.unitAmountCents === "number"
          ? body.unitAmountCents
          : body?.unitAmount != null
            ? Math.round((parseFloat(String(body.unitAmount)) || 0) * 100)
            : undefined,
      currency: typeof body?.currency === "string" ? body.currency : undefined,
      taxRateBps:
        typeof body?.taxRateBps === "number"
          ? body.taxRateBps
          : body?.applyGst === true
            ? 1000
            : body?.applyGst === false
              ? 0
              : undefined,
      active: typeof body?.active === "boolean" ? body.active : undefined,
    });
    return NextResponse.json({ data: product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update product";
    const status = message === "Product not found" ? 404 : 422;
    return NextResponse.json(
      { error: { code: status === 404 ? "not_found" : "validation_error", message } },
      { status },
    );
  }
}

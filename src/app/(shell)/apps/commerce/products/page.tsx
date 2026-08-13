import Link from "next/link";
import { listProducts } from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import {
  CreateProductForm,
  ProductRowActions,
} from "@/components/commerce/CreateProductForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

function formatMoney(cents: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default async function CommerceProductsPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Products</h1>
        </header>
        <main className="dg-page-main">
          <div className="dg-card">
            <p className="text-slate-300">Database not configured.</p>
          </div>
        </main>
      </>
    );
  }

  const products = await listProducts(session.organisationId, {
    includeInactive: true,
  });
  const activeCount = products.filter((p) => p.active).length;

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/commerce"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Commerce
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Products &amp; catalog</h1>
        <p className="text-sm text-slate-400">
          {activeCount} active · {products.length} total — reusable line items for quotes
          and invoices
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CreateProductForm />

        <div className="dg-card dg-table-scroll">
          {!products.length ? (
            <p className="text-sm text-slate-400">
              No products yet. Add catalogue items to speed up quoting.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">SKU</th>
                  <th className="py-2 pr-4 font-medium">Price</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-slate-800/60">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{product.name}</p>
                      {product.description ? (
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                          {product.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">
                      {product.sku || "—"}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {formatMoney(product.unitAmountCents, product.currency)}
                      {product.taxRateBps != null && product.taxRateBps > 0 ? (
                        <span className="ml-1 text-xs text-slate-500">+GST</span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          product.active
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }
                      >
                        {product.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3">
                      <ProductRowActions
                        productId={product.id}
                        active={product.active}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Inventory, variants, and public checkout catalogue remain later. Use products as
          quote/invoice building blocks today.
        </p>
      </main>
    </>
  );
}

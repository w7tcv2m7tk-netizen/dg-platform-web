import Link from "next/link";
import { listProducts, sessionHasFeature } from "@dg/platform-core";

import { CreateProductForm, ProductRowActions } from "@/components/commerce/CreateProductForm";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function formatMoney(cents: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(cents / 100);
}

export default async function CommerceProductsPage() {
  const session = await getAuthorisedPlatformPageSession("commerce.read");
  if (!session) return null;
  const canManage = sessionHasFeature(session, "commerce.manage");

  const products = await listProducts(session.organisationId, { includeInactive: true });
  const activeCount = products.filter((p) => p.active).length;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/commerce" className="text-sm text-blue-400 hover:underline">← Commerce</Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Products &amp; catalog</h1>
        <p className="text-sm text-slate-400">{activeCount} active · {products.length} total — reusable line items for quotes and invoices</p>
      </header>
      <main className="dg-page-main space-y-6">
        {canManage ? <CreateProductForm /> : <div className="dg-card text-sm text-slate-400">You have read-only access to Commerce.</div>}
        <div className="dg-card dg-table-scroll">
          {!products.length ? (
            <p className="text-sm text-slate-400">No products yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">SKU</th>
                  <th className="py-2 pr-4 font-medium">Price</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  {canManage ? <th className="py-2 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-slate-800/60">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{product.name}</p>
                      {product.description ? <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{product.description}</p> : null}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{product.sku || "—"}</td>
                    <td className="py-3 pr-4 text-slate-300">
                      {formatMoney(product.unitAmountCents, product.currency)}
                      {product.taxRateBps != null && product.taxRateBps > 0 ? <span className="ml-1 text-xs text-slate-500">+GST</span> : null}
                    </td>
                    <td className="py-3 pr-4"><span className={product.active ? "text-emerald-400" : "text-slate-500"}>{product.active ? "Active" : "Inactive"}</span></td>
                    {canManage ? <td className="py-3"><ProductRowActions productId={product.id} active={product.active} /></td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-slate-500">Inventory, variants, and public checkout catalogue remain later. Use products as quote/invoice building blocks today.</p>
      </main>
    </>
  );
}

import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white">Payment cancelled</h1>
        <p className="mt-3 text-slate-400">
          No charge was made. Contact the business if you need a new payment link.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-full border border-slate-600 px-5 py-2 text-sm text-slate-200 hover:bg-slate-900"
        >
          Back to platform
        </Link>
      </div>
    </main>
  );
}

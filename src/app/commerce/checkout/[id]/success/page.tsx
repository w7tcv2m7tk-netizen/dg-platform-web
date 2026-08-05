import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white">Payment received</h1>
        <p className="mt-3 text-slate-400">
          Thank you — your payment was successful. You can close this window.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Back to platform
        </Link>
      </div>
    </main>
  );
}

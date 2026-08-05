import Link from "next/link";
import { confirmCheckoutSession } from "@dg/platform-core";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({ params, searchParams }: PageProps) {
  const { id: paymentRequestId } = await params;
  const { session_id: sessionId } = await searchParams;

  let confirmed = false;
  if (sessionId) {
    const result = await confirmCheckoutSession({
      paymentRequestId,
      providerSessionId: sessionId,
    });
    confirmed = result.ok;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white">Payment received</h1>
        <p className="mt-3 text-slate-400">
          {confirmed
            ? "Thank you — your payment was recorded successfully."
            : "Thank you — your payment was successful. Confirmation may take a moment."}
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

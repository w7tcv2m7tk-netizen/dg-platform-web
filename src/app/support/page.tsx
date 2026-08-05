import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

import { SupportActions } from "@/components/SupportActions";
import { SupportChatPanel } from "@/components/support/SupportChatPanel";

export default async function SupportPage() {
  const user = await currentUser();
  const userName =
    user?.firstName ??
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0];

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Support</h1>
        <p className="text-sm text-slate-400">
          Live chat with the DigitalGate team — or email if you prefer
        </p>
      </header>
      <main className="flex-1 space-y-6 p-8">
        <SupportChatPanel embedded userName={userName ?? undefined} />

        <div className="dg-card max-w-xl">
          <h2 className="font-semibold text-white">Email support</h2>
          <p className="mt-2 text-sm text-slate-400">
            Prefer email? We&apos;ll still see your live chat history in the support inbox.
          </p>
          <SupportActions />
        </div>
      </main>
    </>
  );
}

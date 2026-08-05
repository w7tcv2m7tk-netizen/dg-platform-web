import Link from "next/link";

import { SupportActions } from "@/components/SupportActions";
import { Sidebar } from "@/components/Sidebar";

export default function SupportPage() {
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="border-b border-slate-800 px-8 py-5">
          <Link
            href="/dashboard"
            className="text-sm text-blue-400 hover:underline"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">Support</h1>
          <p className="text-sm text-slate-400">
            Get help without leaving the DigitalGate platform
          </p>
        </header>
        <main className="flex-1 p-8">
          <div className="dg-card max-w-xl">
            <h2 className="font-semibold text-white">Contact DigitalGate</h2>
            <p className="mt-2 text-sm text-slate-400">
              Email the team during setup or if something isn&apos;t working in
              your dashboard.
            </p>
            <SupportActions />
          </div>
        </main>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function VipSetupGate({
  required,
  completed,
  children,
}: {
  required: boolean;
  completed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onSetupRoute = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const blocked = required && !completed && !onSetupRoute;

  useEffect(() => {
    if (!blocked) return;
    router.replace("/onboarding?journey=vip-rerun");
  }, [blocked, router]);

  if (blocked) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#05070b] px-6 text-white">
        <div className="max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">DigitalGate private setup</p>
          <h1 className="mt-3 text-2xl font-semibold">Aida is opening your platform setup…</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">Your workspace will open after the business identity, brand and operating preferences are prepared.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

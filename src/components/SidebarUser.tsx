"use client";

import { UserButton } from "@clerk/nextjs";

import { AUTH_AFTER_SIGN_OUT_URL } from "@/lib/auth-routes";

export function SidebarUser() {
  return (
    <div className="mt-auto border-t border-slate-800 pt-4">
      <div className="flex items-center gap-3 px-2">
        <UserButton
          afterSignOutUrl={AUTH_AFTER_SIGN_OUT_URL}
          appearance={{
            elements: {
              avatarBox: "h-9 w-9",
            },
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-300">Account</p>
          <p className="text-[10px] text-slate-500">Manage profile & sign out</p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function TeamSettingsPage() {
  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <Link href="/dashboard/settings" className="text-sm text-blue-400 hover:underline">
          ← Platform settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Team & access</h1>
        <p className="text-sm text-slate-400">
          Invite agents and staff — managed through Clerk
        </p>
      </header>
      <main className="flex-1 p-8">
        <div className="dg-card max-w-xl">
          <h2 className="font-semibold text-white">Organisation members</h2>
          <p className="mt-2 text-sm text-slate-400">
            Team invites and roles are handled in Clerk. Use the account menu at the bottom of
            the sidebar to manage your profile, or open Clerk organisation settings to invite
            colleagues.
          </p>
          <p className="mt-4 text-sm text-slate-400">
            Per-app permissions (CRM, Real Estate, Commerce, etc.) will roll out as manifests
            gain role-based access control.
          </p>
          <p className="mt-6 text-xs text-slate-500">
            Tip: Clerk Dashboard → your application → Organizations → invite members.
          </p>
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import { getPlatformNavigation } from "@dg/platform-core";
import { SidebarUser } from "@/components/SidebarUser";

export function Sidebar() {
  const links = getPlatformNavigation();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-4 py-6">
      <div className="mb-8 px-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
          DigitalGate
        </p>
        <p className="text-sm text-slate-400">Business Platform</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white"
          >
            <span className="text-blue-500">{link.icon ?? "•"}</span>
            {link.label}
          </Link>
        ))}
      </nav>
      <SidebarUser />
    </aside>
  );
}

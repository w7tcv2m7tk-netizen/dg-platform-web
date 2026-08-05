import { SidebarBrand } from "@/components/brand/SidebarBrand";
import { SidebarNav } from "@/components/SidebarNav";
import { SidebarUser } from "@/components/SidebarUser";

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-4 py-6">
      <SidebarBrand />
      <SidebarNav />
      <SidebarUser />
    </aside>
  );
}

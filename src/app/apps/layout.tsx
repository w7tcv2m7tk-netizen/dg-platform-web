import { Sidebar } from "@/components/Sidebar";

export default function AppsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

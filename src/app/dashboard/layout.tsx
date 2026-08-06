import { PlatformShellLoader } from "@/components/PlatformShellLoader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShellLoader>{children}</PlatformShellLoader>;
}

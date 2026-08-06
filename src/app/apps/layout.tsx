import { PlatformShellLoader } from "@/components/PlatformShellLoader";

export default function AppsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShellLoader>{children}</PlatformShellLoader>;
}

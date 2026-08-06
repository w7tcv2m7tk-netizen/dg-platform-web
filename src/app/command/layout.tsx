import { PlatformShellLoader } from "@/components/PlatformShellLoader";

export default function CommandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShellLoader>{children}</PlatformShellLoader>;
}
